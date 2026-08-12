"""Tests for Pydantic schemas."""
import pytest
from pydantic import ValidationError

from app.schemas.work import WorkCreate, WorkUpdate


class TestWorkCreate:
    def test_minimal_valid(self):
        w = WorkCreate(title="x")
        assert w.title == "x"
        assert w.status == "draft"
        assert w.target_words == 0

    def test_full(self):
        w = WorkCreate(
            title="雾隐山河",
            subtitle="副",
            genre="玄幻",
            style="热血",
            pov="第三人称",
            description="简介",
            target_words=1000,
            status="writing",
            cover=None,
            notes="笔记",
        )
        assert w.title == "雾隐山河"

    def test_title_empty(self):
        with pytest.raises(ValidationError):
            WorkCreate(title="")

    def test_title_too_long(self):
        with pytest.raises(ValidationError):
            WorkCreate(title="x" * 201)

    def test_target_negative(self):
        with pytest.raises(ValidationError):
            WorkCreate(title="x", target_words=-1)


class TestWorkUpdate:
    def test_all_optional(self):
        u = WorkUpdate()
        d = u.model_dump(exclude_unset=True)
        assert d == {}

    def test_partial(self):
        u = WorkUpdate(status="writing", target_words=5000)
        d = u.model_dump(exclude_unset=True)
        assert d == {"status": "writing", "target_words": 5000}

    def test_exclude_unset(self):
        u = WorkUpdate(title="A", subtitle=None)
        d = u.model_dump(exclude_unset=True)
        # subtitle=None is the default sentinel value
        # exclude_unset still keeps it because it was explicitly set
        assert "title" in d
        assert d["title"] == "A"

    def test_target_negative(self):
        with pytest.raises(ValidationError):
            WorkUpdate(target_words=-100)

    def test_title_empty(self):
        with pytest.raises(ValidationError):
            WorkUpdate(title="")