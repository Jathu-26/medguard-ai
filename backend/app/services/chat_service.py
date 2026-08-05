"""Cross-document chat service with hybrid retrieval, clinical entity boosting, and evidence-grounded answers."""
from __future__ import annotations

import json
import math
import re
import uuid
from collections import defaultdict
from typing import Any

from sqlalchemy.orm import Session

from app.ai.provider import get_provider
from app.models import (
    Allergy,
    ChatMessage,
    ChatSession,
    DiagnosisMention,
    DocumentPage,
    LabResult,
    MedicalDocument,
    MedicalVisit,
    Medication,
    SafetyAlert,
)
from app.schemas.analytics import ChatAnswerOut


def _chunk_document(text: str, size: int = 500, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks."""
    words = re.split(r"\s+", text.strip())
    if not words or not words[0]:
        return []
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + size])
        if chunk:
            chunks.append(chunk)
        i += max(1, size - overlap)
    return chunks


def _get_patient_clinical_summary(db: Session, patient_id: str) -> str:
    """Compile structured patient clinical context (medications, allergies, labs, alerts) to enrich RAG."""
    meds = db.query(Medication).filter(Medication.patient_id == patient_id).all()
    allergies = db.query(Allergy).filter(Allergy.patient_id == patient_id).all()
    alerts = db.query(SafetyAlert).filter(SafetyAlert.patient_id == patient_id).all()
    labs = db.query(LabResult).filter(LabResult.patient_id == patient_id).order_by(LabResult.date.desc()).limit(15).all()

    summary_lines = ["[STRUCTURED CLINICAL PROFILE]"]
    if meds:
        med_strs = [f"- {m.name_as_written} ({m.dose or ''} {m.frequency or ''}) [Status: {m.status or 'active'}, Page: {getattr(m, 'page_number', 1)}]" for m in meds]
        summary_lines.append("Active/Recorded Medications:\n" + "\n".join(med_strs))
    if allergies:
        allergy_strs = [f"- {a.substance} (Reaction: {a.reaction or 'unknown'}, Severity: {a.severity or 'unspecified'})" for a in allergies]
        summary_lines.append("Known Allergies:\n" + "\n".join(allergy_strs))
    if alerts:
        alert_strs = [f"- [{a.risk_level.upper()}] {a.title}: {a.explanation or ''}" for a in alerts]
        summary_lines.append("Safety Alerts:\n" + "\n".join(alert_strs))
    if labs:
        lab_strs = [f"- {l.test_name_as_written}: {l.value} {l.unit or ''} ({l.status or 'recorded'}) on {l.date or 'unknown date'}" for l in labs]
        summary_lines.append("Recent Lab Results:\n" + "\n".join(lab_strs))

    return "\n\n".join(summary_lines)


def _hybrid_retrieve_chunks(db: Session, patient_id: str, question: str, top_k: int = 8) -> list[dict[str, Any]]:
    """Hybrid retrieval combining keyword matching, BM25 term weighting, and medical entity boosting."""
    question_terms = set(re.findall(r"[a-z0-9]{2,}", question.lower()))
    docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).all()
    
    # Retrieve all medical entities for boosting
    meds = db.query(Medication).filter(Medication.patient_id == patient_id).all()
    allergies = db.query(Allergy).filter(Allergy.patient_id == patient_id).all()
    clinical_keywords = set()
    for m in meds:
        if m.name_as_written:
            clinical_keywords.update(re.findall(r"[a-z0-9]{3,}", m.name_as_written.lower()))
        if m.normalised_name:
            clinical_keywords.update(re.findall(r"[a-z0-9]{3,}", m.normalised_name.lower()))
    for a in allergies:
        if a.substance:
            clinical_keywords.update(re.findall(r"[a-z0-9]{3,}", a.substance.lower()))

    all_chunks = []
    for doc in docs:
        pages = (
            db.query(DocumentPage)
            .filter(DocumentPage.document_id == doc.id)
            .order_by(DocumentPage.page_number)
            .all()
        )
        for page in pages:
            for chunk in _chunk_document(page.text):
                all_chunks.append(
                    {
                        "text": chunk,
                        "document_id": doc.id,
                        "document": doc.original_name,
                        "document_date": str(doc.document_date or ""),
                        "doc_type": doc.classification or "Document",
                        "page": page.page_number,
                    }
                )

    if not all_chunks:
        return []
    if not question_terms:
        return all_chunks[:top_k]

    scored = []
    avg_len = sum(len(c["text"].split()) for c in all_chunks) / max(len(all_chunks), 1)

    for chunk in all_chunks:
        chunk_words = re.findall(r"[a-z0-9]{2,}", chunk["text"].lower())
        chunk_len = max(len(chunk_words), 1)
        term_freq = defaultdict(int)
        for w in chunk_words:
            term_freq[w] += 1

        bm25_score = 0.0
        for term in question_terms:
            tf = term_freq.get(term, 0)
            if tf > 0:
                # BM25 term saturation formula
                bm25_score += (tf * (1.5 + 1)) / (tf + 1.5 * (1 - 0.75 + 0.75 * (chunk_len / avg_len)))

        # Entity boost: if chunk contains clinical keywords present in the query
        entity_overlap = len(question_terms & clinical_keywords & set(chunk_words))
        boost = 1.0 + (entity_overlap * 2.0)

        # Cross-document metadata context
        total_score = bm25_score * boost
        if total_score > 0:
            scored.append((total_score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:top_k]]


def create_session(db: Session, patient_id: str) -> ChatSession:
    session = ChatSession(patient_id=patient_id, title="Medical records chat")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_or_create_session(db: Session, patient_id: str, session_id: str | None) -> ChatSession:
    if session_id:
        session = db.get(ChatSession, session_id)
        if session and session.patient_id == patient_id:
            return session
    return create_session(db, patient_id)


def answer_question(
    db: Session,
    patient_id: str,
    question: str,
    session_id: str | None = None,
) -> tuple[ChatAnswerOut, str]:
    """Answer a question grounded in the patient's documents and structured records. Returns (answer, session_id)."""
    session = get_or_create_session(db, patient_id, session_id)

    # 1. Hybrid chunk retrieval
    chunks = _hybrid_retrieve_chunks(db, patient_id, question, top_k=8)

    # 2. Extract structured clinical profile
    clinical_summary = _get_patient_clinical_summary(db, patient_id)

    # 3. Assemble rich context with source document headers & page numbers
    context_blocks = [clinical_summary]
    for c in chunks:
        header = f"[Document: {c['document']} | Page: {c['page']} | Type: {c.get('doc_type')} | Date: {c.get('document_date')}]"
        context_blocks.append(f"{header}\n{c['text']}")

    provider = get_provider()
    raw = provider.answer_question(question, context_blocks)

    # 4. Build precise evidence citations with authentic page numbers
    evidence = []
    for c in chunks[:5]:
        evidence.append(
            {
                "snippet": c["text"][:260],
                "document": c["document"],
                "page": c["page"],
            }
        )

    # If raw provider already provided specific evidence entries, merge/use them
    if raw.get("evidence") and isinstance(raw["evidence"], list):
        parsed_ev = []
        for e in raw["evidence"]:
            if isinstance(e, dict) and e.get("snippet"):
                parsed_ev.append(e)
        if parsed_ev:
            evidence = parsed_ev

    answer = ChatAnswerOut(
        answer=raw.get("answer", "The uploaded records do not contain enough reliable information to answer this question."),
        reasoning_summary=raw.get("reasoning_summary"),
        relevant_dates=raw.get("relevant_dates", []),
        medications=raw.get("medications", []),
        tests=raw.get("tests", []),
        evidence=evidence,
        confidence=float(raw.get("confidence", 75.0 if chunks else 30.0)),
        risk_level=raw.get("risk_level", "Low"),
        recommendation=raw.get("recommendation", "Professional review strongly recommended."),
        disclaimer=(
            "This application provides AI-assisted document review and does not provide medical "
            "diagnosis, treatment, or professional medical advice. AI-generated findings may be "
            "incomplete or incorrect. Consult a qualified doctor or pharmacist before making any "
            "healthcare decision."
        ),
        missing_information=raw.get("missing_information", []),
    )

    # Persist messages
    db.add(
        ChatMessage(
            session_id=session.id,
            role="user",
            content=question,
        )
    )
    db.add(
        ChatMessage(
            session_id=session.id,
            role="assistant",
            content=json.dumps(answer.model_dump()),
        )
    )
    db.commit()
    return answer, session.id


def get_history(db: Session, patient_id: str, session_id: str | None) -> list[ChatMessage]:
    session = get_or_create_session(db, patient_id, session_id)
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
