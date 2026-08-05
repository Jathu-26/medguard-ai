"""Chat request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: str | None = None


class ChatMessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str  # JSON string for assistant
    created_at: datetime | None = None


class ChatHistoryOut(BaseModel):
    session_id: str
    messages: list[ChatMessageOut] = Field(default_factory=list)
