"""Chat session and message models."""
from __future__ import annotations

import uuid
from typing import List

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    title: Mapped[str | None] = mapped_column(String, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="chat_sessions")  # noqa: F821
    messages: Mapped[List["ChatMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String, nullable=False)  # user / assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)  # JSON for assistant answers
    created_at_text: Mapped[str | None] = mapped_column(String, nullable=True)

    session: Mapped["ChatSession"] = relationship(back_populates="messages")
