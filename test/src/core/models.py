from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd


@dataclass(frozen=True)
class InventoryRecord:
    record_key: str
    source_id: str | None
    order_id: str | None
    serial: str | None
    vehicle: str | None
    product: str | None
    customer: str | None
    created: pd.Timestamp | None
    days_stored: int
    set_status: str | None
    is_free_stock: bool
    needs_manual_review: bool
    duplicate_flags: tuple[str, ...] = ()
    review_reasons: tuple[str, ...] = ()


@dataclass(frozen=True)
class DecisionRecord:
    record_key: str
    availability_type: str
    recommendation: str
    candidate_record_key: str | None
    candidate_order_id: str | None
    candidate_source: str | None
    decision_reason: str
    completable: bool
    requires_fabrication: bool


@dataclass(frozen=True)
class OutputPaths:
    detail_csv: Path
    matches_csv: Path
    quality_csv: Path
    pdf_report: Path
    run_log: Path
    manifest: Path
    latest_manifest: Path


@dataclass
class RunArtifacts:
    summary: dict[str, Any]
    detail_df: pd.DataFrame
    matches_df: pd.DataFrame
    quality_df: pd.DataFrame
    output_paths: OutputPaths
    source_file: Path
    manifest: dict[str, Any] = field(default_factory=dict)
