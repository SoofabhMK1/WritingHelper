"""Enum of every AI endpoint that ``_call`` and ``free_chat`` can dispatch to.

Used to populate ``LlmRequestLog.endpoint`` so a typo on a route path can't
silently end up in the audit log as a different URL than the one that
actually served the call.
"""
from enum import Enum


class AIEndpoint(str, Enum):
    OUTLINE = "/ai/suggest/outline"
    CHAPTERS = "/ai/suggest/chapters"
    CHARACTER = "/ai/suggest/character"
    EVENT = "/ai/suggest/event"
    CONSISTENCY = "/ai/check/consistency"
    CHAT = "/ai/chat"
    CONTINUE = "/ai/suggest/continue"
    EXPAND = "/ai/suggest/expand"
    COMPLETION = "/ai/suggest/completion"
    UNKNOWN = ""