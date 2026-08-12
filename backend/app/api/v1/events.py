from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.character import Character
from app.models.chapter import Chapter
from app.models.event import Event, EventCharacter, EventLink
from app.models.work import Work
from app.schemas.event import (
    EventCharacterIn,
    EventCharacterOut,
    EventCreate,
    EventLinkIn,
    EventLinkOut,
    EventOut,
    EventUpdate,
    EventWithRelations,
)

router = APIRouter(prefix="/works/{work_id}/events", tags=["events"])


def _get_work_or_404(work_id: int, db: Session) -> Work:
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


def _get_event_or_404(event_id: int, work_id: int, db: Session) -> Event:
    ev = db.get(Event, event_id)
    if not ev or ev.work_id != work_id:
        raise HTTPException(status_code=404, detail="Event not found")
    return ev


def _validate_chapter(chapter_id: Optional[int], work_id: int, db: Session) -> None:
    if chapter_id is None:
        return
    ch = db.get(Chapter, chapter_id)
    if not ch or ch.work_id != work_id:
        raise HTTPException(status_code=400, detail="chapter_id does not belong to work")


# =============================================================================
# Events CRUD
# =============================================================================

@router.get("", response_model=List[EventOut])
def list_events(
    work_id: int,
    event_type: Optional[str] = Query(None),
    chapter_id: Optional[int] = Query(None),
    event_status: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    stmt = select(Event).where(Event.work_id == work_id)
    if event_type:
        stmt = stmt.where(Event.event_type == event_type)
    if chapter_id is not None:
        stmt = stmt.where(Event.chapter_id == chapter_id)
    if event_status:
        stmt = stmt.where(Event.status == event_status)
    # 按故事内时间(文本,可能为空)排序,空置末
    stmt = stmt.order_by(Event.story_time.is_(None), Event.story_time, Event.id)
    return list(db.scalars(stmt).all())


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    work_id: int,
    payload: EventCreate,
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    _validate_chapter(payload.chapter_id, work_id, db)
    ev = Event(work_id=work_id, **payload.model_dump())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.get("/{event_id}", response_model=EventWithRelations)
def get_event(work_id: int, event_id: int, db: Session = Depends(get_db)):
    stmt = (
        select(Event)
        .where(Event.id == event_id, Event.work_id == work_id)
        .options(selectinload(Event.character_links))
    )
    ev = db.scalars(stmt).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    out_links = list(
        db.scalars(
            select(EventLink).where(
                EventLink.work_id == work_id, EventLink.source_event_id == event_id
            )
        ).all()
    )
    in_links = list(
        db.scalars(
            select(EventLink).where(
                EventLink.work_id == work_id, EventLink.target_event_id == event_id
            )
        ).all()
    )
    return EventWithRelations(
        **EventOut.model_validate(ev).model_dump(),
        character_links=[EventCharacterOut.model_validate(l) for l in ev.character_links],
        links_out=[EventLinkOut.model_validate(l) for l in out_links],
        links_in=[EventLinkOut.model_validate(l) for l in in_links],
    )


@router.put("/{event_id}", response_model=EventOut)
def update_event(
    work_id: int,
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
):
    ev = _get_event_or_404(event_id, work_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "chapter_id" in data:
        _validate_chapter(data["chapter_id"], work_id, db)
    for k, v in data.items():
        setattr(ev, k, v)
    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(work_id: int, event_id: int, db: Session = Depends(get_db)):
    ev = _get_event_or_404(event_id, work_id, db)
    db.delete(ev)
    db.commit()
    return None


# =============================================================================
# Event ↔ Character associations
# =============================================================================

@router.post(
    "/{event_id}/characters",
    response_model=EventCharacterOut,
    status_code=status.HTTP_201_CREATED,
)
def add_character_to_event(
    work_id: int,
    event_id: int,
    payload: EventCharacterIn,
    db: Session = Depends(get_db),
):
    ev = _get_event_or_404(event_id, work_id, db)
    ch = db.get(Character, payload.character_id)
    if not ch or ch.work_id != work_id:
        raise HTTPException(status_code=400, detail="character_id does not belong to work")
    link = EventCharacter(
        event_id=ev.id,
        character_id=payload.character_id,
        role=payload.role,
        note=payload.note,
    )
    db.add(link)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Character already linked to this event")
    db.refresh(link)
    return link


@router.delete(
    "/{event_id}/characters/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_character_from_event(
    work_id: int,
    event_id: int,
    link_id: int,
    db: Session = Depends(get_db),
):
    link = db.get(EventCharacter, link_id)
    if not link or link.event_id != event_id:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return None


# =============================================================================
# Event ↔ Event causal links
# =============================================================================

@router.get(
    "/{event_id}/links",
    response_model=List[EventLinkOut],
)
def list_event_links(work_id: int, event_id: int, db: Session = Depends(get_db)):
    _get_event_or_404(event_id, work_id, db)
    stmt = (
        select(EventLink)
        .where(EventLink.work_id == work_id)
        .where(
            (EventLink.source_event_id == event_id)
            | (EventLink.target_event_id == event_id)
        )
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/{event_id}/links",
    response_model=EventLinkOut,
    status_code=status.HTTP_201_CREATED,
)
def add_event_link(
    work_id: int,
    event_id: int,
    payload: EventLinkIn,
    db: Session = Depends(get_db),
):
    if payload.source_event_id == payload.target_event_id:
        raise HTTPException(status_code=400, detail="source and target must differ")
    _get_event_or_404(payload.source_event_id, work_id, db)
    _get_event_or_404(payload.target_event_id, work_id, db)
    link = EventLink(
        work_id=work_id,
        source_event_id=payload.source_event_id,
        target_event_id=payload.target_event_id,
        link_type=payload.link_type,
        note=payload.note,
    )
    db.add(link)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Link already exists")
    db.refresh(link)
    return link


@router.delete(
    "/{event_id}/links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_event_link(
    work_id: int,
    event_id: int,
    link_id: int,
    db: Session = Depends(get_db),
):
    link = db.get(EventLink, link_id)
    if not link or link.work_id != work_id:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return None