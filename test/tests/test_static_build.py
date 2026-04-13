from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from src.static_site import build_static_site


def test_static_build_generates_fixed_artifacts_and_public_payloads(tmp_path: Path) -> None:
    input_dir = tmp_path / "input"
    input_dir.mkdir(parents=True, exist_ok=True)
    excel_path = input_dir / "inventory.xlsx"

    dataframe = pd.DataFrame(
        [
            {
                "ID": "1",
                "OrderID": "ORD-1",
                "Serial": "SER-1",
                "Vehicle": "Hilux",
                "Created": "2020-01-01",
                "Product": "C34",
                "Invoice": "INV-1",
                "InvoiceCost": 1000,
                "Customer": "Cliente A",
                "DaysStored": 300,
                "SetStatus": "Incomplete",
            },
            {
                "ID": "2",
                "OrderID": "ORD-2",
                "Serial": "SER-2",
                "Vehicle": "Hilux",
                "Created": "2020-01-02",
                "Product": "C34",
                "Invoice": "INV-2",
                "InvoiceCost": 900,
                "Customer": "Cliente A",
                "DaysStored": 500,
                "SetStatus": "Additionals",
            },
            {
                "ID": "3",
                "OrderID": "ORD-3",
                "Serial": "SER-3",
                "Vehicle": "",
                "Created": "2020-01-03",
                "Product": "C34",
                "Invoice": "INV-3",
                "InvoiceCost": 800,
                "Customer": "Cliente B",
                "DaysStored": 100,
                "SetStatus": "Incomplete",
            },
        ]
    )
    dataframe.to_excel(excel_path, index=False)

    artifacts = build_static_site(target_root=tmp_path)

    assert artifacts.paths.results_json.exists()
    assert artifacts.paths.summary_json.exists()
    assert artifacts.paths.results_js.exists()
    assert artifacts.paths.summary_js.exists()
    assert artifacts.paths.pdf_report.exists()

    results_payload = json.loads(artifacts.paths.results_json.read_text(encoding="utf-8"))
    summary_payload = json.loads(artifacts.paths.summary_json.read_text(encoding="utf-8"))

    assert len(results_payload) == 3
    assert summary_payload["source_file_name"] == "inventory.xlsx"
    assert summary_payload["kpis"]["total_inventory"] == 3
    assert summary_payload["kpis"]["completables"] == 1
    assert summary_payload["download_paths"]["pdf_report"] == "./reports/informe_agp.pdf"

    receiver = next(item for item in results_payload if item["order_id"] == "ORD-1")
    manual = next(item for item in results_payload if item["order_id"] == "ORD-3")

    assert receiver["candidate_match_orderid"] == "ORD-2"
    assert receiver["compatibility"]["all_candidates_count"] == 1
    assert receiver["compatibility"]["best_candidate"]["order_id"] == "ORD-2"
    assert receiver["original"]["invoice"] == "INV-1"
    assert manual["needs_manual_review"] is True
    assert manual["compatibility"]["all_candidates_count"] == 0


def test_static_build_prefers_input_directory_over_root_excel(tmp_path: Path) -> None:
    root_excel = tmp_path / "root_file.xlsx"
    preferred_excel = tmp_path / "input" / "preferred.xlsx"
    preferred_excel.parent.mkdir(parents=True, exist_ok=True)

    pd.DataFrame(
        [
            {
                "ID": "10",
                "OrderID": "ROOT-1",
                "Serial": "SER-10",
                "Vehicle": "Mazda 3",
                "Created": "2020-01-01",
                "Product": "C34",
                "Invoice": "INV-10",
                "InvoiceCost": 100,
                "Customer": "Cliente Root",
                "DaysStored": 100,
                "SetStatus": "Complete",
            }
        ]
    ).to_excel(root_excel, index=False)

    pd.DataFrame(
        [
            {
                "ID": "20",
                "OrderID": "INPUT-1",
                "Serial": "SER-20",
                "Vehicle": "Hilux",
                "Created": "2020-01-01",
                "Product": "MH21",
                "Invoice": "INV-20",
                "InvoiceCost": 200,
                "Customer": "",
                "DaysStored": 200,
                "SetStatus": "Incomplete",
            }
        ]
    ).to_excel(preferred_excel, index=False)

    artifacts = build_static_site(target_root=tmp_path)

    assert artifacts.source_file.name == "preferred.xlsx"
    assert artifacts.summary_payload["source_file_name"] == "preferred.xlsx"
