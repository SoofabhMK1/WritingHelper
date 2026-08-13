
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.v1.deps import (
    get_scoped_or_404,
    get_work_or_404,
    validate_child_belongs_to_work,
)
from app.database import get_db
from app.models.chapter import Chapter
from app.models.character import Character
from app.models.event import Event, EventCharacter, EventLink
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


def _get_event_or_404(db: Session, work_id: int, event_id: int) -> Event:
    return get_scoped_or_404(
        db, model=Event, work_id=work_id, child_id=event_id, label="Event"
    )


# =============================================================================
# Events CRUD
# =============================================================================

@router.get("", response_model=list[EventOut])
def list_events(
    work_id: int,
    event_type: str | None = Query(None),
    chapter_id: int | None = Query(None),
    status: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    get_work_or_404(db, work_id)
    stmt = select(Event).where(Event.work_id == work_id)
    if event_type:
        stmt = stmt.where(Event.event_type == event_type)
    if chapter_id is not None:
        stmt = stmt.where(Event.chapter_id == chapter_id)
    if status:
        stmt = stmt.where(Event.status == status)
    # 按故事内时间(文本,可能为空)排序,空置末
    stmt = stmt.order_by(Event.story_time.is_(None), Event.story_time, Event.id)
    return list(db.scalars(stmt).all())


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    work_id: int,
    payload: EventCreate,
    db: Session = Depends(get_db),
):
    get_work_or_404(db, work_id)
    validate_child_belongs_to_work(
        db, model=Chapter, work_id=work_id, child_id=payload.chapter_id, label="chapter_id"
    )
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
        character_links=[
            EventCharacterOut.model_validate(link) for link in ev.character_links
        ],
        links_out=[EventLinkOut.model_validate(link) for link in out_links],
        links_in=[EventLinkOut.model_validate(link) for link in in_links],
    )


@router.put("/{event_id}", response_model=EventOut)
def update_event(
    work_id: int,
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
):
    ev = _get_event_or_404(db, work_id, event_id)
    data = payload.model_dump(exclude_unset=True)
    if "chapter_id" in data:
        validate_child_belongs_to_work(
            db, model=Chapter, work_id=work_id, child_id=data["chapter_id"], label="chapter_id"
        )
    for k, v in data.items():
        setattr(ev, k, v)
    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(work_id: int, event_id: int, db: Session = Depends(get_db)):
    ev = _get_event_or_404(db, work_id, event_id)
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
    ev = _get_event_or_404(db, work_id, event_id)
    validate_child_belongs_to_work(
        db,
        model=Character,
        work_id=work_id,
        child_id=payload.character_id,
        label="character_id",
    )
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
        raise HTTPException(
            status_code=409, detail="Character already linked to this event"
        ) from None
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
    response_model=list[EventLinkOut],
)
def list_event_links(work_id: int, event_id: int, db: Session = Depends(get_db)):
    _get_event_or_404(db, work_id, event_id)
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
    if event_id != payload.source_event_id and event_id != payload.target_event_id:
        raise HTTPException(
            status_code=400,
            detail="URL event_id must match source_event_id or target_event_id",
        )
    _get_event_or_404(db, work_id, payload.source_event_id)
    _get_event_or_404(db, work_id, payload.target_event_id)
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
        raise HTTPException(status_code=409, detail="Link already exists") from None
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