from __future__ import annotations

import pandas as pd

from src.core.cleaner import clean_inventory_data
from src.core.recommender import build_recommendations


def _base_dataframe(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)[
        [
            "ID",
            "OrderID",
            "Serial",
            "Vehicle",
            "Created",
            "Product",
            "Invoice",
            "InvoiceCost",
            "Customer",
            "DaysStored",
            "SetStatus",
        ]
    ]


def test_priority_is_additional_before_incomplete_before_free_stock() -> None:
    raw_df = _base_dataframe(
        [
            {"ID": "1", "OrderID": "R-1", "Serial": "S-1", "Vehicle": "Hilux", "Created": "2020-01-01", "Product": "C34", "Invoice": "I-1", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 1200, "SetStatus": "Incomplete"},
            {"ID": "2", "OrderID": "D-ADD", "Serial": "S-2", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "I-2", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 300, "SetStatus": "Additionals"},
            {"ID": "3", "OrderID": "D-INC", "Serial": "S-3", "Vehicle": "Hilux", "Created": "2020-01-03", "Product": "C34", "Invoice": "I-3", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 900, "SetStatus": "Incomplete"},
            {"ID": "4", "OrderID": "FREE-1", "Serial": "S-4", "Vehicle": "Hilux", "Created": "2020-01-04", "Product": "C34", "Invoice": "I-4", "InvoiceCost": 100, "Customer": "", "DaysStored": 1200, "SetStatus": "Incomplete"},
        ]
    )

    detail_df, _matches_df = build_recommendations(clean_inventory_data(raw_df))
    receiver = detail_df.loc[detail_df["OrderID"].eq("R-1")].iloc[0]

    assert receiver["candidate_match_orderid"] == "D-ADD"
    assert receiver["candidate_match_type"] == "additional"
    assert receiver["priority_score"] == 1
    assert receiver["decision_code"] == "Completable with Additional"


def test_incomplete_match_is_used_when_no_additional_exists() -> None:
    raw_df = _base_dataframe(
        [
            {"ID": "1", "OrderID": "R-1", "Serial": "S-1", "Vehicle": "Hilux", "Created": "2020-01-01", "Product": "C34", "Invoice": "I-1", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 200, "SetStatus": "Incomplete"},
            {"ID": "2", "OrderID": "D-INC", "Serial": "S-2", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "I-2", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 400, "SetStatus": "Incomplete"},
        ]
    )

    detail_df, _matches_df = build_recommendations(clean_inventory_data(raw_df))
    receiver = detail_df.loc[detail_df["OrderID"].eq("R-1")].iloc[0]

    assert receiver["candidate_match_orderid"] == "D-INC"
    assert receiver["candidate_match_type"] == "incomplete"
    assert receiver["priority_score"] == 2
    assert receiver["decision_code"] == "Completable with Incomplete"


def test_free_stock_is_used_only_after_same_customer_options_are_exhausted() -> None:
    raw_df = _base_dataframe(
        [
            {"ID": "1", "OrderID": "R-1", "Serial": "S-1", "Vehicle": "Hilux", "Created": "2020-01-01", "Product": "C34", "Invoice": "I-1", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 100, "SetStatus": "Incomplete"},
            {"ID": "2", "OrderID": "FREE-1", "Serial": "S-2", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "I-2", "InvoiceCost": 100, "Customer": "", "DaysStored": 400, "SetStatus": "Additionals"},
        ]
    )

    detail_df, _matches_df = build_recommendations(clean_inventory_data(raw_df))
    receiver = detail_df.loc[detail_df["OrderID"].eq("R-1")].iloc[0]

    assert receiver["candidate_match_orderid"] == "FREE-1"
    assert receiver["candidate_match_type"] == "free_stock"
    assert receiver["priority_score"] == 3
    assert receiver["PrimaryMatchValidation"] == "Requiere validacion comercial"


def test_customer_vehicle_and_product_must_match() -> None:
    raw_df = _base_dataframe(
        [
            {"ID": "1", "OrderID": "R-1", "Serial": "S-1", "Vehicle": "Hilux", "Created": "2020-01-01", "Product": "C34", "Invoice": "I-1", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 500, "SetStatus": "Incomplete"},
            {"ID": "2", "OrderID": "BAD-CUSTOMER", "Serial": "S-2", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "I-2", "InvoiceCost": 100, "Customer": "Cliente B", "DaysStored": 800, "SetStatus": "Additionals"},
            {"ID": "3", "OrderID": "BAD-VEHICLE", "Serial": "S-3", "Vehicle": "Mazda 3", "Created": "2020-01-03", "Product": "C34", "Invoice": "I-3", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 900, "SetStatus": "Additionals"},
            {"ID": "4", "OrderID": "BAD-PRODUCT", "Serial": "S-4", "Vehicle": "Hilux", "Created": "2020-01-04", "Product": "iC34", "Invoice": "I-4", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 950, "SetStatus": "Additionals"},
        ]
    )

    detail_df, _matches_df = build_recommendations(clean_inventory_data(raw_df))
    receiver = detail_df.loc[detail_df["OrderID"].eq("R-1")].iloc[0]

    assert receiver["candidate_match_type"] == "none"
    assert bool(receiver["should_manufacture"]) is True


def test_complete_donors_are_excluded_and_vehicle_empty_goes_to_manual_review() -> None:
    raw_df = _base_dataframe(
        [
            {"ID": "1", "OrderID": "R-1", "Serial": "S-1", "Vehicle": "Hilux", "Created": "2020-01-01", "Product": "C34", "Invoice": "I-1", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 100, "SetStatus": "Incomplete"},
            {"ID": "2", "OrderID": "COMPLETE-1", "Serial": "S-2", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "I-2", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 500, "SetStatus": "Complete"},
            {"ID": "3", "OrderID": "REVIEW-1", "Serial": "S-3", "Vehicle": "", "Created": "2020-01-03", "Product": "C34", "Invoice": "I-3", "InvoiceCost": 100, "Customer": "Cliente B", "DaysStored": 50, "SetStatus": "Incomplete"},
        ]
    )

    detail_df, _matches_df = build_recommendations(clean_inventory_data(raw_df))
    receiver = detail_df.loc[detail_df["OrderID"].eq("R-1")].iloc[0]
    manual = detail_df.loc[detail_df["OrderID"].eq("REVIEW-1")].iloc[0]

    assert receiver["decision_code"] == "Requires Manufacturing"
    assert manual["decision_code"] == "Manual Review Required"
    assert manual["decision_label"] == "Requiere revision manual"


def test_tiebreaker_uses_oldest_created_then_id() -> None:
    raw_df = _base_dataframe(
        [
            {"ID": "9", "OrderID": "R-1", "Serial": "S-1", "Vehicle": "Hilux", "Created": "2020-01-01", "Product": "C34", "Invoice": "I-1", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 100, "SetStatus": "Incomplete"},
            {"ID": "2", "OrderID": "D-OLDER", "Serial": "S-2", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "I-2", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 400, "SetStatus": "Additionals"},
            {"ID": "1", "OrderID": "D-ID", "Serial": "S-3", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "I-3", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 400, "SetStatus": "Additionals"},
        ]
    )

    detail_df, _matches_df = build_recommendations(clean_inventory_data(raw_df))
    receiver = detail_df.loc[detail_df["OrderID"].eq("R-1")].iloc[0]

    assert receiver["candidate_match_orderid"] == "D-ID"


def test_primary_donor_is_consumed_only_once() -> None:
    raw_df = _base_dataframe(
        [
            {"ID": "1", "OrderID": "R-OLD", "Serial": "S-1", "Vehicle": "Hilux", "Created": "2020-01-01", "Product": "C34", "Invoice": "I-1", "InvoiceCost": 100, "Customer": "Cliente A", "DaysStored": 300, "SetStatus": "Incomplete"},
            {"ID": "2", "OrderID": "R-NEW", "Serial": "S-2", "Vehicle": "Hilux", "Created": "2020-01-02", "Product": "C34", "Invoice": "I-2", "InvoiceCost": 100, "Customer": "Cliente B", "DaysStored": 100, "SetStatus": "Incomplete"},
            {"ID": "3", "OrderID": "FREE-1", "Serial": "S-3", "Vehicle": "Hilux", "Created": "2020-01-03", "Product": "C34", "Invoice": "I-3", "InvoiceCost": 100, "Customer": "", "DaysStored": 500, "SetStatus": "Additionals"},
        ]
    )

    detail_df, _matches_df = build_recommendations(clean_inventory_data(raw_df))
    old_receiver = detail_df.loc[detail_df["OrderID"].eq("R-OLD")].iloc[0]
    new_receiver = detail_df.loc[detail_df["OrderID"].eq("R-NEW")].iloc[0]

    assert old_receiver["candidate_match_orderid"] == "FREE-1"
    assert bool(new_receiver["should_manufacture"]) is True
