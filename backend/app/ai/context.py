"""Build context strings from a work for AI prompts.

Each builder returns a human-readable summary of the relevant data. Kept
intentionally short so they don't blow up the token budget.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.character import Character
from app.models.chapter import Chapter
from app.models.event import Event
from app.models.protagonist import ProtagonistProfile
from app.models.state import CharacterState
from app.models.work import Work


def work_summary(db: Session, work_id: int) -> str:
    work = db.get(Work, work_id)
    if not work:
        return "(未找到作品)"
    return (
        f"标题:{work.title}\n"
        f"题材:{work.genre or '—'}\n"
        f"风格:{work.style or '—'}\n"
        f"视角:{work.pov or '—'}\n"
        f"目标字数:{work.target_words}\n"
        f"简介:{work.description or '—'}\n"
        f"备注:{work.notes or '—'}"
    )


def characters_summary(db: Session, work_id: int, limit: int = 30) -> str:
    chars = (
        db.query(Character)
        .filter(Character.work_id == work_id)
        .order_by(Character.id)
        .limit(limit)
        .all()
    )
    if not chars:
        return "(尚无人物)"
    lines = []
    for c in chars:
        line = f"- [{c.role}] {c.name}"
        if c.aliases:
            line += f"({c.aliases})"
        if c.personality:
            line += f":{c.personality[:60]}"
        lines.append(line)
    return "\n".join(lines)


def events_summary(db: Session, work_id: int, limit: int = 30) -> str:
    events = (
        db.query(Event)
        .filter(Event.work_id == work_id)
        .order_by(Event.story_time.is_(None), Event.story_time, Event.id)
        .limit(limit)
        .all()
    )
    if not events:
        return "(尚无事件)"
    lines = []
    for e in events:
        time = e.story_time or "—"
        lines.append(f"- [{e.event_type}|{time}|imp{e.importance}] {e.title}")
    return "\n".join(lines)


def chapters_summary(db: Session, work_id: int, limit: int = 30) -> str:
    chapters = (
        db.query(Chapter)
        .filter(Chapter.work_id == work_id)
        .order_by(Chapter.order_num, Chapter.id)
        .limit(limit)
        .all()
    )
    if not chapters:
        return "(尚无章节)"
    return "\n".join(
        f"- {c.order_num}. {c.title} [{c.status}]" for c in chapters
    )


def states_summary(db: Session, work_id: int, limit: int = 30) -> str:
    states = (
        db.query(CharacterState)
        .filter(CharacterState.work_id == work_id)
        .order_by(CharacterState.id.desc())
        .limit(limit)
        .all()
    )
    if not states:
        return "(尚无人物状态)"
    return "\n".join(
        f"- char#{s.character_id} {s.state_type}.{s.state_key}={s.state_value}"
        + (f" @{s.captured_at}" if s.captured_at else "")
        for s in states
    )


def protagonists_summary(db: Session, work_id: int) -> str:
    profiles = (
        db.query(ProtagonistProfile)
        .filter(ProtagonistProfile.work_id == work_id)
        .all()
    )
    if not profiles:
        return "(尚无主角深度设定)"
    chars = {c.id: c for c in db.query(Character).filter(Character.work_id == work_id).all()}
    lines = []
    for p in profiles:
        ch = chars.get(p.character_id)
        head = f"- 主角 {ch.name if ch else '#' + str(p.character_id)}"
        if p.core_conflict:
            head += f" 核心冲突:{p.core_conflict}"
        if p.lie_believed:
            head += f" 谎言:{p.lie_believed}"
        if p.truth_needed:
            head += f" 真相:{p.truth_needed}"
        lines.append(head)
    return "\n".join(lines)


def full_context(db: Session, work_id: int) -> str:
    return "\n\n".join(
        [
            "## 作品设定\n" + work_summary(db, work_id),
            "## 主角深度设定\n" + protagonists_summary(db, work_id),
            "## 已有章节\n" + chapters_summary(db, work_id),
            "## 人物\n" + characters_summary(db, work_id),
            "## 事件\n" + events_summary(db, work_id),
            "## 人物状态\n" + states_summary(db, work_id),
        ]
    )