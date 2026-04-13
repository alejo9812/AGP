from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pandas as pd

from src.core.analyzer import build_quality_table, build_summary
from src.core.cleaner import clean_inventory_data
from src.core.config import MATCH_TYPE_LABELS, SET_STATUS_LABELS
from src.core.loader import find_latest_excel_in_search_order, load_excel
from src.core.recommender import build_recommendations
from src.core.validator import validate_required_columns
from src.reports.pdf_report import generate_pdf_report
from src.utils.paths import PREFERRED_INPUT_DIR, ROOT_DIR, STATIC_DATA_DIR, STATIC_REPORTS_DIR

RESULTS_JSON_NAME = "resultados.json"
SUMMARY_JSON_NAME = "resumen.json"
RESULTS_JS_NAME = "resultados.js"
SUMMARY_JS_NAME = "resumen.js"
PDF_REPORT_NAME = "informe_agp.pdf"

ORIGINAL_FIELDS = {
    "Original_ID": "id",
    "Original_OrderID": "order_id",
    "Original_Serial": "serial",
    "Original_Vehicle": "vehicle",
    "Original_Created": "created",
    "Original_Product": "product",
    "Original_Invoice": "invoice",
    "Original_InvoiceCost": "invoice_cost",
    "Original_Customer": "customer",
    "Original_DaysStored": "days_stored",
    "Original_SetStatus": "set_status",
}


@dataclass(frozen=True)
class StaticBuildPaths:
    data_dir: Path
    reports_dir: Path
    results_json: Path
    summary_json: Path
    results_js: Path
    summary_js: Path
    pdf_report: Path


@dataclass(frozen=True)
class StaticBuildArtifacts:
    source_file: Path
    paths: StaticBuildPaths
    summary_payload: dict[str, Any]
    results_payload: list[dict[str, Any]]
    quality_payload: list[dict[str, Any]]


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    try:
        return bool(pd.isna(value))
    except TypeError:
        return False


def _json_scalar(value: Any, *, empty_to_none: bool = True) -> Any:
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            value = str(value)
    if _is_missing(value):
        return None
    if isinstance(value, str):
        text = value.strip()
        if empty_to_none and not text:
            return None
        return text
    return value


def _json_bool(value: Any) -> bool:
    if _is_missing(value):
        return False
    return bool(value)


def _json_int(value: Any) -> int:
    scalar = _json_scalar(value, empty_to_none=False)
    if scalar in (None, ""):
        return 0
    return int(scalar)


def _display_datetime(iso_value: str | None) -> str:
    if not iso_value:
        return "-"
    timestamp = pd.to_datetime(iso_value, errors="coerce")
    if pd.isna(timestamp):
        return "-"
    return timestamp.strftime("%Y-%m-%d %H:%M")


def _build_paths(target_root: Path) -> StaticBuildPaths:
    data_dir = target_root / STATIC_DATA_DIR.name
    reports_dir = target_root / STATIC_REPORTS_DIR.name
    data_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)
    return StaticBuildPaths(
        data_dir=data_dir,
        reports_dir=reports_dir,
        results_json=data_dir / RESULTS_JSON_NAME,
        summary_json=data_dir / SUMMARY_JSON_NAME,
        results_js=data_dir / RESULTS_JS_NAME,
        summary_js=data_dir / SUMMARY_JS_NAME,
        pdf_report=reports_dir / PDF_REPORT_NAME,
    )


def _resolve_source_file(source_file: Path | None, target_root: Path) -> Path:
    if source_file is not None:
        return Path(source_file)

    preferred_input_dir = target_root / PREFERRED_INPUT_DIR.name
    return find_latest_excel_in_search_order([preferred_input_dir, target_root])


def _serialize_candidate(candidate_row: dict[str, Any]) -> dict[str, Any]:
    customer_display = _json_scalar(candidate_row.get("donor_customer"))
    customer_value = None if customer_display == "Stock libre" else customer_display
    candidate_source = _json_scalar(candidate_row.get("candidate_match_type") or candidate_row.get("candidate_source")) or "none"
    set_status = _json_scalar(candidate_row.get("donor_set_status"))
    return {
        "record_key": _json_scalar(candidate_row.get("donor_record_key")),
        "source_id": _json_scalar(candidate_row.get("donor_source_id")),
        "order_id": _json_scalar(candidate_row.get("donor_order_id")),
        "customer": customer_value,
        "customer_display": customer_display or "Stock libre",
        "vehicle": _json_scalar(candidate_row.get("donor_vehicle")),
        "product": _json_scalar(candidate_row.get("donor_product")),
        "days_stored": _json_int(candidate_row.get("donor_days_stored")),
        "set_status": set_status,
        "set_status_label": SET_STATUS_LABELS.get(set_status or "", set_status or "-"),
        "candidate_source": candidate_source,
        "candidate_source_label": MATCH_TYPE_LABELS.get(candidate_source, candidate_source),
        "rank_within_source": _json_int(candidate_row.get("rank_within_source")),
        "rank_overall": _json_int(candidate_row.get("rank_overall")),
        "is_primary": _json_bool(candidate_row.get("is_primary")),
        "explanation": _json_scalar(candidate_row.get("explanation")) or "",
    }


def _build_matches_index(matches_df: pd.DataFrame) -> dict[str, dict[str, Any]]:
    if matches_df.empty:
        return {}

    matches_index: dict[str, dict[str, Any]] = {}
    sorted_matches = matches_df.sort_values(by=["receiver_record_key", "rank_overall"], ascending=[True, True])

    for receiver_key, group_df in sorted_matches.groupby("receiver_record_key"):
        candidates = [_serialize_candidate(row) for row in group_df.to_dict(orient="records")]
        additional_candidates = [candidate for candidate in candidates if candidate["candidate_source"] == "additional"]
        incomplete_candidates = [candidate for candidate in candidates if candidate["candidate_source"] == "incomplete"]
        free_stock_candidates = [candidate for candidate in candidates if candidate["candidate_source"] == "free_stock"]
        same_customer_candidates = additional_candidates + incomplete_candidates
        best_candidate = next((candidate for candidate in candidates if candidate["is_primary"]), None)

        matches_index[str(receiver_key)] = {
            "all_candidates_count": len(candidates),
            "additional_count": len(additional_candidates),
            "incomplete_count": len(incomplete_candidates),
            "same_customer_count": len(same_customer_candidates),
            "free_stock_count": len(free_stock_candidates),
            "has_additional_candidates": bool(additional_candidates),
            "has_incomplete_candidates": bool(incomplete_candidates),
            "has_same_customer_candidates": bool(same_customer_candidates),
            "has_free_stock_candidates": bool(free_stock_candidates),
            "best_candidate": best_candidate,
            "additional_candidates": additional_candidates,
            "incomplete_candidates": incomplete_candidates,
            "same_customer_candidates": same_customer_candidates,
            "free_stock_candidates": free_stock_candidates,
        }

    return matches_index


def _build_original_payload(row: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for source_field, target_field in ORIGINAL_FIELDS.items():
        payload[target_field] = _json_scalar(row.get(source_field))
    return payload


def _build_result_record(row: dict[str, Any], match_info: dict[str, Any] | None) -> dict[str, Any]:
    created_value = _json_scalar(row.get("Created"))
    customer_value = _json_scalar(row.get("Customer"))
    vehicle_value = _json_scalar(row.get("Vehicle"))
    product_value = _json_scalar(row.get("Product"))

    compatibility = match_info or {
        "all_candidates_count": 0,
        "additional_count": 0,
        "incomplete_count": 0,
        "same_customer_count": 0,
        "free_stock_count": 0,
        "has_additional_candidates": False,
        "has_incomplete_candidates": False,
        "has_same_customer_candidates": False,
        "has_free_stock_candidates": False,
        "best_candidate": None,
        "additional_candidates": [],
        "incomplete_candidates": [],
        "same_customer_candidates": [],
        "free_stock_candidates": [],
    }

    set_status = _json_scalar(row.get("SetStatus"))
    set_status_label = _json_scalar(row.get("SetStatusLabel")) or SET_STATUS_LABELS.get(set_status or "", set_status or "-")
    candidate_source = _json_scalar(row.get("candidate_match_type") or row.get("CandidateSource"))
    candidate_source_label = _json_scalar(row.get("candidate_match_type_label")) or MATCH_TYPE_LABELS.get(
        candidate_source or "none",
        candidate_source or "-",
    )
    additional_candidate_count = _json_int(row.get("additional_candidate_count"))
    incomplete_candidate_count = _json_int(row.get("incomplete_candidate_count"))
    free_stock_candidate_count = _json_int(row.get("free_stock_candidate_count") or row.get("FreeStockCandidateCount"))
    same_customer_candidate_count = (
        additional_candidate_count + incomplete_candidate_count
        if additional_candidate_count or incomplete_candidate_count
        else _json_int(row.get("SameCustomerCandidateCount"))
    )

    return {
        "record_key": _json_scalar(row.get("RecordKey")),
        "row_number": _json_int(row.get("RowNumber")),
        "source_id": _json_scalar(row.get("ID")),
        "order_id": _json_scalar(row.get("OrderID")),
        "serial": _json_scalar(row.get("Serial")),
        "vehicle": vehicle_value,
        "vehicle_display": _json_scalar(row.get("VehicleDisplay")) or "Revision manual",
        "product": product_value,
        "product_display": _json_scalar(row.get("ProductDisplay")) or "Sin producto",
        "customer": customer_value,
        "customer_display": _json_scalar(row.get("CustomerDisplay")) or "Stock libre",
        "created": created_value,
        "created_display": _json_scalar(row.get("CreatedDisplay")) or "-",
        "invoice": _json_scalar(row.get("Invoice")),
        "invoice_cost": float(_json_scalar(row.get("InvoiceCost"), empty_to_none=False) or 0),
        "days_stored": _json_int(row.get("DaysStored")),
        "set_status": set_status,
        "set_status_label": set_status_label,
        "decision_code": _json_scalar(row.get("decision_code")),
        "availability_status": _json_scalar(row.get("AvailabilityType")) or "",
        "recommendation": _json_scalar(row.get("Recommendation")) or "",
        "candidate_match_record_key": _json_scalar(row.get("CandidateRecordKey")),
        "candidate_match_orderid": _json_scalar(row.get("CandidateOrderID")),
        "candidate_source": candidate_source,
        "candidate_source_label": candidate_source_label,
        "decision_reason": _json_scalar(row.get("DecisionReason")) or "",
        "primary_match_validation": _json_scalar(row.get("PrimaryMatchValidation")) or "",
        "review_reasons": _json_scalar(row.get("ReviewReasons")) or "",
        "duplicate_flags": _json_scalar(row.get("DuplicateFlags")) or "",
        "is_free_stock": _json_bool(row.get("IsFreeStock")),
        "completable": _json_bool(row.get("Completable")),
        "requires_fabrication": _json_bool(row.get("RequiresFabrication")),
        "needs_manual_review": _json_bool(row.get("NeedsManualReview")),
        "missing_vehicle": _json_bool(row.get("MissingVehicle")),
        "missing_product": _json_bool(row.get("MissingProduct")),
        "invalid_set_status": _json_bool(row.get("InvalidSetStatus")),
        "invalid_created": _json_bool(row.get("InvalidCreated")),
        "duplicate_id": _json_bool(row.get("DuplicateID")),
        "duplicate_order_id": _json_bool(row.get("DuplicateOrderID")),
        "duplicate_serial": _json_bool(row.get("DuplicateSerial")),
        "additional_candidate_count": additional_candidate_count,
        "incomplete_candidate_count": incomplete_candidate_count,
        "same_customer_candidate_count": same_customer_candidate_count,
        "free_stock_candidate_count": free_stock_candidate_count,
        "original": _build_original_payload(row),
        "compatibility": compatibility,
    }


def _rename_summary_records(records: list[dict[str, Any]], field_map: dict[str, str]) -> list[dict[str, Any]]:
    renamed: list[dict[str, Any]] = []
    for record in records:
        renamed_record = {field_map.get(key, key): _json_scalar(value) for key, value in record.items()}
        renamed.append(renamed_record)
    return renamed


def _build_summary_payload(
    summary: dict[str, Any],
    quality_df: pd.DataFrame,
    source_file: Path,
) -> dict[str, Any]:
    generated_at = _json_scalar(summary.get("generated_at")) or ""
    quality_payload = []
    for row in quality_df.to_dict(orient="records"):
        quality_payload.append(
            {
                "category": _json_scalar(row.get("Category")) or "",
                "metric": _json_scalar(row.get("Metric")) or "",
                "value": _json_int(row.get("Value")),
            }
        )

    return {
        "generated_at": generated_at,
        "generated_at_display": _display_datetime(generated_at),
        "source_file_name": source_file.name,
        "source_file": str(source_file.resolve()),
        "download_paths": {
            "resultados_json": f"./{STATIC_DATA_DIR.name}/{RESULTS_JSON_NAME}",
            "resumen_json": f"./{STATIC_DATA_DIR.name}/{SUMMARY_JSON_NAME}",
            "pdf_report": f"./{STATIC_REPORTS_DIR.name}/{PDF_REPORT_NAME}",
        },
        "kpis": {
            "total_inventory": _json_int(summary.get("total_records")),
            "complete": _json_int(summary.get("complete_total")),
            "incomplete": _json_int(summary.get("incomplete_total")),
            "additionals": _json_int(summary.get("additionals_total")),
            "stock_libre": _json_int(summary.get("free_stock_total")),
            "completables": _json_int(summary.get("completable_total")),
            "requieren_fabricacion": _json_int(summary.get("requires_fabrication_total")),
            "revision_manual": _json_int(summary.get("manual_review_total")),
        },
        "set_status_counts": {
            str(key): _json_int(value) for key, value in (summary.get("set_status_counts") or {}).items()
        },
        "availability_counts": {
            str(key): _json_int(value) for key, value in (summary.get("availability_counts") or {}).items()
        },
        "match_type_counts": {
            str(key): _json_int(value) for key, value in (summary.get("match_type_counts") or {}).items()
        },
        "oldest_days_stored": _json_int(summary.get("oldest_days_stored")),
        "free_stock_percentage": float(summary.get("free_stock_percentage") or 0),
        "inventory_reduction_opportunity_percentage": float(summary.get("inventory_reduction_opportunity_percentage") or 0),
        "top_oldest_free_stock": _rename_summary_records(
            summary.get("top_oldest_free_stock") or [],
            {
                "OrderID": "order_id",
                "Product": "product",
                "Vehicle": "vehicle",
                "DaysStored": "days_stored",
                "SetStatus": "set_status",
                "SetStatusLabel": "set_status_label",
            },
        ),
        "top_requires_fabrication": _rename_summary_records(
            summary.get("top_requires_fabrication") or [],
            {
                "OrderID": "order_id",
                "Product": "product",
                "Vehicle": "vehicle",
                "Customer": "customer",
                "DaysStored": "days_stored",
            },
        ),
        "top_combinations": _rename_summary_records(
            summary.get("top_combinations") or [],
            {"combination": "combination", "count": "count"},
        ),
        "review_rows": _rename_summary_records(
            summary.get("review_rows") or [],
            {
                "RecordKey": "record_key",
                "OrderID": "order_id",
                "Vehicle": "vehicle",
                "Product": "product",
                "ReviewReasons": "review_reasons",
            },
        ),
        "quality_metrics": quality_payload,
    }


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _write_js_assignment(path: Path, property_name: str, payload: Any) -> None:
    script = [
        "window.__AGP_PRUEBAS__ = window.__AGP_PRUEBAS__ || {};",
        f"window.__AGP_PRUEBAS__.{property_name} = {json.dumps(payload, ensure_ascii=False)};",
        "",
    ]
    path.write_text("\n".join(script), encoding="utf-8")


def build_static_site(source_file: Path | None = None, target_root: Path | None = None) -> StaticBuildArtifacts:
    resolved_root = Path(target_root) if target_root else ROOT_DIR
    resolved_source = _resolve_source_file(source_file, resolved_root)
    paths = _build_paths(resolved_root)

    raw_df = load_excel(resolved_source)
    validate_required_columns(raw_df)
    cleaned_df = clean_inventory_data(raw_df)
    detail_df, matches_df = build_recommendations(cleaned_df)
    quality_df = build_quality_table(detail_df, matches_df)
    summary = build_summary(detail_df, matches_df)

    generate_pdf_report(summary, detail_df, matches_df, quality_df, paths.pdf_report, resolved_source)

    matches_index = _build_matches_index(matches_df)
    results_payload = [
        _build_result_record(row, matches_index.get(str(row.get("RecordKey"))))
        for row in detail_df.to_dict(orient="records")
    ]
    summary_payload = _build_summary_payload(summary, quality_df, resolved_source)

    _write_json(paths.results_json, results_payload)
    _write_json(paths.summary_json, summary_payload)
    _write_js_assignment(paths.results_js, "resultados", results_payload)
    _write_js_assignment(paths.summary_js, "resumen", summary_payload)

    return StaticBuildArtifacts(
        source_file=resolved_source,
        paths=paths,
        summary_payload=summary_payload,
        results_payload=results_payload,
        quality_payload=summary_payload["quality_metrics"],
    )
