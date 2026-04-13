from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import InventoryImportBatch
from app.schemas import ImportAnalysisResponse, ImportBatchRead, ImportPreviewResponse, ImportProcessResponse
from app.services.actors import get_actor_by_email
from app.services.import_service import preview_dataset, process_import

router = APIRouter()


@router.get("", response_model=list[ImportBatchRead])
def list_imports(db: Session = Depends(get_db)) -> list[InventoryImportBatch]:
    return list(db.scalars(select(InventoryImportBatch).order_by(InventoryImportBatch.created_at.desc())))


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(file: UploadFile = File(...)) -> dict:
    payload = await file.read()
    return preview_dataset(file.filename or "inventory.xlsx", payload)


@router.post("", response_model=ImportProcessResponse)
def create_import(
    file: UploadFile = File(...),
    replace_existing: bool = Form(default=True),
    x_demo_user: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    actor = get_actor_by_email(db, x_demo_user)
    return process_import(db=db, actor=actor, upload=file, replace_existing=replace_existing)


@router.get("/{batch_uuid}/analysis", response_model=ImportAnalysisResponse)
def import_analysis(batch_uuid: str, db: Session = Depends(get_db)) -> dict:
    batch = db.scalar(select(InventoryImportBatch).where(InventoryImportBatch.batch_uuid == batch_uuid))
    return {
        "batch": batch,
        "summary": {
            "missing_customer": batch.rows_needing_review if batch else 0,
            "missing_vehicle": batch.rows_needing_review if batch else 0,
            "missing_product": 0,
            "needs_review": batch.rows_needing_review if batch else 0,
            "duplicate_orders": 0,
            "duplicate_serials": 0,
        },
        "examples": [],
    }

