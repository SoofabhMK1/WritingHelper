"""Model-level tests for Work."""
from app.models.work import Work, WorkStatus


def test_create_and_query(db_session):
    w = Work(
        title="测试",
        genre="玄幻",
        target_words=1000,
        status=WorkStatus.DRAFT.value,
    )
    db_session.add(w)
    db_session.commit()
    db_session.refresh(w)

    assert w.id is not None
    assert w.title == "测试"
    assert w.status == "draft"
    assert w.current_words == 0
    assert w.created_at is not None
    assert w.updated_at is not None


def test_status_enum_values():
    assert WorkStatus.DRAFT.value == "draft"
    assert WorkStatus.WRITING.value == "writing"
    assert WorkStatus.PAUSED.value == "paused"
    assert WorkStatus.COMPLETED.value == "completed"
    assert WorkStatus.ABANDONED.value == "abandoned"


def test_optional_fields_default_to_none(db_session):
    w = Work(title="A")
    db_session.add(w)
    db_session.commit()
    db_session.refresh(w)

    assert w.subtitle is None
    assert w.genre is None
    assert w.style is None
    assert w.pov is None
    assert w.description is None
    assert w.cover is None
    assert w.notes is None


def test_persistence_roundtrip(db_session):
    w = Work(title="持久化", description="d", genre="仙侠")
    db_session.add(w)
    db_session.commit()
    wid = w.id
    db_session.expire_all()

    again = db_session.get(Work, wid)
    assert again is not None
    assert again.title == "持久化"
    assert again.description == "d"
    assert again.genre == "仙侠"