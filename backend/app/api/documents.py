import json
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models import DocumentPage, MedicalDocument, ProcessingJob
from app.schemas.document import DocumentOut, ProcessingJobOut, ProcessResponse, UploadResponse
from app.services import document_service, patient_service
from app.services.analytics_service import build_timeline_events
from app.services.processing_service import (
    PROCESSING_STAGES,
    process_document,
    rerun_rules_for_patient,
)

router = APIRouter(prefix="/api", tags=["documents"])


def _execute_processing_job(doc_id: str, job_id: str) -> None:
    """Worker function to process document with real-time stage updates in background."""
    db: Session = SessionLocal()
    try:
        doc = db.get(MedicalDocument, doc_id)
        job = db.get(ProcessingJob, job_id)
        if not doc or not job:
            return

        def stage_callback(stage_name: str, pct: float) -> None:
            try:
                job.current_stage = stage_name
                job.overall_progress = round(pct, 1)
                stages = json.loads(job.stages or "[]")
                if stage_name not in stages:
                    stages.append(stage_name)
                    job.stages = json.dumps(stages)
                db.commit()
            except Exception:
                pass

        process_document(db, doc, run_rules=False, progress_callback=stage_callback)

        if doc.processing_status != "completed":
            job.status = "failed" if doc.processing_status == "failed" else "needs_review"
            job.error_message = doc.error_message
        else:
            job.status = "completed"
            job.overall_progress = 100.0

        rerun_rules_for_patient(db, doc.patient_id)
        build_timeline_events(db, doc.patient_id)
        db.commit()
    except Exception as exc:
        job = db.get(ProcessingJob, job_id)
        if job:
            job.status = "failed"
            job.error_message = str(exc)
            db.commit()
    finally:
        db.close()


@router.post("/patients/{patient_id}/documents", response_model=UploadResponse, status_code=201)
async def upload_documents(
    patient_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    patient = patient_service.get_patient_or_404(db, patient_id)
    created = []
    for file in files:
        document_service.validate_upload(file)
        stored_path, storage_name, original, size = document_service.store_upload(file, patient_id)
        doc = document_service.create_document_record(
            db, patient, stored_path, storage_name, original, file.content_type or "application/octet-stream", size
        )
        created.append(document_service.to_out(doc))
    return UploadResponse(documents=created)


@router.get("/patients/{patient_id}/documents", response_model=list[DocumentOut])
def list_documents(patient_id: str, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    docs = (
        db.query(MedicalDocument)
        .filter(MedicalDocument.patient_id == patient_id)
        .order_by(MedicalDocument.created_at.desc())
        .all()
    )
    return [document_service.to_out(d) for d in docs]


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db)):
    return document_service.to_out(document_service.get_document_or_404(db, document_id))


@router.get("/documents/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    doc = document_service.get_document_or_404(db, document_id)
    if not doc.stored_path or not Path(doc.stored_path).exists():
        raise HTTPException(status_code=404, detail="File not found on server")
    return FileResponse(
        path=doc.stored_path,
        media_type=doc.mime_type or "application/octet-stream",
        filename=doc.original_name,
    )


@router.get("/documents/{document_id}/pages")
def get_document_pages(document_id: str, db: Session = Depends(get_db)):
    doc = document_service.get_document_or_404(db, document_id)
    pages = (
        db.query(DocumentPage)
        .filter(DocumentPage.document_id == doc.id)
        .order_by(DocumentPage.page_number)
        .all()
    )
    return [
        {"page_number": p.page_number, "text": p.text, "method": p.method, "confidence": p.confidence}
        for p in pages
    ]


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = document_service.get_document_or_404(db, document_id)
    patient_id = doc.patient_id
    document_service.delete_document(db, document_id)
    rerun_rules_for_patient(db, patient_id)
    build_timeline_events(db, patient_id)
    return None


@router.post("/documents/{document_id}/process", response_model=ProcessResponse)
def process_document_endpoint(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    doc = document_service.get_document_or_404(db, document_id)

    job = ProcessingJob(
        patient_id=doc.patient_id,
        status="processing",
        current_stage="Reading document",
        overall_progress=10.0,
        stages=json.dumps(["Reading document"]),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch actual background processing with live stage progression
    background_tasks.add_task(_execute_processing_job, doc.id, job.id)

    return ProcessResponse(job_id=job.id, status=job.status)


@router.post("/patients/{patient_id}/process-all", response_model=list[ProcessResponse])
def process_all_patient_documents(
    patient_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    patient_service.get_patient_or_404(db, patient_id)
    docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).all()
    responses = []
    for doc in docs:
        job = ProcessingJob(
            patient_id=patient_id,
            status="processing",
            current_stage="Reading document",
            overall_progress=10.0,
            stages=json.dumps(["Reading document"]),
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        background_tasks.add_task(_execute_processing_job, doc.id, job.id)
        responses.append(ProcessResponse(job_id=job.id, status=job.status))
    return responses


@router.get("/processing/{job_id}", response_model=ProcessingJobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.get(ProcessingJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    return ProcessingJobOut(
        id=job.id,
        patient_id=job.patient_id,
        status=job.status,
        current_stage=job.current_stage,
        overall_progress=job.overall_progress,
        error_message=job.error_message,
        stages=json.loads(job.stages or "[]"),
    )
