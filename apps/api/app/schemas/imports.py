from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import APIModel


class ImportBatchRead(APIModel):
    id: int
    batch_uuid: str
    file_name: str
    source_type: str
    total_rows: int
    valid_rows: int
    rows_needing_review: int
    status: str
    created_at: datetime


class ImportPreviewResponse(APIModel):
    source_type: str
    detected_headers: list[str]
    missing_required_headers: list[str]
    preview_rows: list[dict[str, str | None]]
    row_count: int


class ImportProcessResponse(APIModel):
    batch: ImportBatchRead
    inserted_items: int
    review_items: int
    free_stock_items: int
    message: str


class DataQualitySummary(APIModel):
    missing_customer: int = 0
    missing_vehicle: int = 0
    missing_product: int = 0
    needs_review: int = 0
    duplicate_orders: int = 0
    duplicate_serials: int = 0


class ImportAnalysisResponse(APIModel):
    batch: ImportBatchRead
    summary: DataQualitySummary
    examples: list[dict[str, str | None]] = Field(default_factory=list)

