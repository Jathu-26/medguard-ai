"""Patient model."""
from __future__ import annotations

import uuid
from typing import List

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class Patient(Base, TimestampMixin):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    date_of_birth: Mapped[str | None] = mapped_column(String, nullable=True)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String, nullable=True)
    known_allergies: Mapped[str | None] = mapped_column(Text, nullable=True)

    documents: Mapped[List["MedicalDocument"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
    visits: Mapped[List["MedicalVisit"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
    allergies: Mapped[List["Allergy"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
    lab_results: Mapped[List["LabResult"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
    alerts: Mapped[List["SafetyAlert"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
    timeline_events: Mapped[List["TimelineEvent"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
    chat_sessions: Mapped[List["ChatSession"]] = relationship(  # noqa: F821
        back_populates="patient", cascade="all, delete-orphan"
    )
