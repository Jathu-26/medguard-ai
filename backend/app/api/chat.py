"""Cross-document chat endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.analytics import ChatAnswerOut
from app.schemas.chat import ChatRequest, ChatHistoryOut, ChatMessageOut
from app.services import patient_service
from app.services.chat_service import answer_question, get_history

router = APIRouter(prefix="/api/patients", tags=["chat"])


@router.post("/{patient_id}/chat", response_model=ChatAnswerOut)
def chat(patient_id: str, payload: ChatRequest, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    answer, _session_id = answer_question(db, patient_id, payload.question, payload.session_id)
    return answer


@router.get("/{patient_id}/chat/history", response_model=ChatHistoryOut)
def chat_history(patient_id: str, session_id: str | None = None, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    messages = get_history(db, patient_id, session_id)
    return ChatHistoryOut(
        session_id=session_id or "",
        messages=[
            ChatMessageOut(
                id=m.id,
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )
