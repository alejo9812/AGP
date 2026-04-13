from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from src.core.analyzer import build_quality_table, build_summary
from src.core.cleaner import clean_inventory_data
from src.core.loader import find_latest_excel, load_excel
from src.core.models import OutputPaths, RunArtifacts
from src.core.recommender import build_recommendations
from src.core.validator import validate_required_columns
from src.reports.pdf_report import generate_pdf_report
from src.utils.paths import LATEST_MANIFEST_PATH, OUTPUT_DIR, build_timestamp, ensure_output_dir


def _json_safe(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value.resolve())
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:  # pragma: no cover - defensive fallback for numpy scalars
            return str(value)
    return value


def _build_output_paths(output_dir: Path, timestamp: str) -> OutputPaths:
    output_dir.mkdir(parents=True, exist_ok=True)
    return OutputPaths(
        detail_csv=output_dir / f"resultado_detalle_{timestamp}.csv",
        matches_csv=output_dir / f"resultado_matches_{timestamp}.csv",
        quality_csv=output_dir / f"resultado_calidad_{timestamp}.csv",
        pdf_report=output_dir / f"informe_agp_{timestamp}.pdf",
        run_log=output_dir / f"ejecucion_agp_{timestamp}.json",
        manifest=output_dir / f"manifest_agp_{timestamp}.json",
        latest_manifest=LATEST_MANIFEST_PATH if output_dir == OUTPUT_DIR else output_dir / "latest_run_manifest.json",
    )


def run_pipeline(source_file: Path | None = None, output_dir: Path | None = None) -> RunArtifacts:
    source_path = Path(source_file) if source_file else find_latest_excel()
    target_output_dir = Path(output_dir) if output_dir else ensure_output_dir()
    timestamp = build_timestamp()
    output_paths = _build_output_paths(target_output_dir, timestamp)

    raw_df = load_excel(source_path)
    validate_required_columns(raw_df)
    cleaned_df = clean_inventory_data(raw_df)
    detail_df, matches_df = build_recommendations(cleaned_df)
    quality_df = build_quality_table(detail_df, matches_df)
    summary = build_summary(detail_df, matches_df)

    detail_df.to_csv(output_paths.detail_csv, index=False, encoding="utf-8-sig")
    matches_df.to_csv(output_paths.matches_csv, index=False, encoding="utf-8-sig")
    quality_df.to_csv(output_paths.quality_csv, index=False, encoding="utf-8-sig")
    generate_pdf_report(summary, detail_df, matches_df, quality_df, output_paths.pdf_report, source_path)

    manifest = {
        "generated_at": summary["generated_at"],
        "source_file": str(source_path.resolve()),
        "source_file_name": source_path.name,
        "summary": _json_safe(summary),
        "output_paths": {
            "detail_csv": str(output_paths.detail_csv.resolve()),
            "matches_csv": str(output_paths.matches_csv.resolve()),
            "quality_csv": str(output_paths.quality_csv.resolve()),
            "pdf_report": str(output_paths.pdf_report.resolve()),
            "run_log": str(output_paths.run_log.resolve()),
            "manifest": str(output_paths.manifest.resolve()),
        },
    }
    run_log = {
        **manifest,
        "detail_row_count": int(len(detail_df)),
        "match_row_count": int(len(matches_df)),
        "quality_metric_count": int(len(quality_df)),
    }

    output_paths.run_log.write_text(json.dumps(_json_safe(run_log), indent=2, ensure_ascii=False), encoding="utf-8")
    output_paths.manifest.write_text(json.dumps(_json_safe(manifest), indent=2, ensure_ascii=False), encoding="utf-8")
    output_paths.latest_manifest.write_text(json.dumps(_json_safe(manifest), indent=2, ensure_ascii=False), encoding="utf-8")

    return RunArtifacts(
        summary=summary,
        detail_df=detail_df,
        matches_df=matches_df,
        quality_df=quality_df,
        output_paths=output_paths,
        source_file=source_path,
        manifest=manifest,
    )
