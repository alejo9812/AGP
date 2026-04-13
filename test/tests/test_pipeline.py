from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.core.pipeline import run_pipeline


def test_pipeline_generates_outputs_and_flags_quality_rules(tmp_path: Path) -> None:
    excel_path = tmp_path / "inventory.xlsx"
    output_dir = tmp_path / "outputs"

    dataframe = pd.DataFrame(
        [
            {"ID": "1", "OrderID": "ORD-1", "Serial": "SER-1", "Vehicle": "Hilux", "Created": "2020-01-01", "Product": "C34", "Invoice": "INV-1", "InvoiceCost": 1000, "Customer": "Cliente A", "DaysStored": 300, "SetStatus": "Incomplete"},
            {"ID": "2", "OrderID": "ORD-2", "Serial": "SER-2", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "INV-2", "InvoiceCost": 900, "Customer": "Cliente A", "DaysStored": 500, "SetStatus": "Additionals"},
            {"ID": "3", "OrderID": "ORD-3", "Serial": "SER-3", "Vehicle": "", "Created": "2020-01-03", "Product": "C34", "Invoice": "INV-3", "InvoiceCost": 800, "Customer": "Cliente B", "DaysStored": 100, "SetStatus": "Incomplete"},
            {"ID": "4", "OrderID": "ORD-4", "Serial": "SER-4", "Vehicle": "Mazda 3", "Created": "2020-01-04", "Product": "C34", "Invoice": "INV-4", "InvoiceCost": 700, "Customer": "", "DaysStored": 120, "SetStatus": "Incomplete"},
        ]
    )
    dataframe.to_excel(excel_path, index=False)

    artifacts = run_pipeline(source_file=excel_path, output_dir=output_dir)

    assert artifacts.output_paths.pdf_report.exists()
    assert artifacts.output_paths.detail_csv.exists()
    assert artifacts.output_paths.matches_csv.exists()
    assert artifacts.output_paths.quality_csv.exists()
    assert artifacts.output_paths.latest_manifest.exists()
    assert artifacts.summary["completable_total"] == 1
    assert artifacts.summary["manual_review_total"] == 1
    assert artifacts.summary["free_stock_total"] == 1
