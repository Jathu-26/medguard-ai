"""MedGuard AI backend application entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, chat, demo, documents, patients
from app.core.config import get_settings
from app.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialised.")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="MedGuard AI - Medical Report and Prescription Cross-Checker",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }


app.include_router(patients.router)
app.include_router(documents.router)
app.include_router(analytics.router)
app.include_router(chat.router)
app.include_router(demo.router)
