from __future__ import annotations

from typing import Any

import pandas as pd

from src.core.config import DECISION_CODES, DECISION_LABELS, MATCH_TYPE_LABELS, PRIORITY_SCORES
from src.core.rules import candidate_buckets, donor_eligibility_mask, match_row_to_dict, sort_receivers

MATCH_COLUMNS = [
    "receiver_record_key",
    "receiver_order_id",
    "receiver_customer",
    "receiver_vehicle",
    "receiver_product",
    "receiver_days_stored",
    "donor_record_key",
    "donor_source_id",
    "donor_order_id",
    "donor_customer",
    "donor_vehicle",
    "donor_product",
    "donor_days_stored",
    "donor_set_status",
    "candidate_match_type",
    "rank_within_source",
    "rank_overall",
    "is_primary",
    "explanation",
]
PRIMARY_BUCKET_ORDER = ("additional", "incomplete", "free_stock")


def _default_decision_frame(clean_df: pd.DataFrame) -> pd.DataFrame:
    decision_df = clean_df.copy()
    decision_df["decision_code"] = ""
    decision_df["decision_label"] = ""
    decision_df["candidate_match_type"] = "none"
    decision_df["candidate_match_type_label"] = MATCH_TYPE_LABELS["none"]
    decision_df["candidate_match_id"] = pd.NA
    decision_df["candidate_match_orderid"] = pd.NA
    decision_df["recommendation"] = ""
    decision_df["decision_reason"] = ""
    decision_df["requires_manual_review"] = decision_df["NeedsManualReview"].astype(bool)
    decision_df["should_manufacture"] = False
    decision_df["priority_score"] = pd.NA
    decision_df["additional_candidate_count"] = 0
    decision_df["incomplete_candidate_count"] = 0
    decision_df["free_stock_candidate_count"] = 0

    # Backward-compatible aliases used by the rest of the local MVP.
    decision_df["AvailabilityType"] = ""
    decision_df["Recommendation"] = ""
    decision_df["CandidateRecordKey"] = pd.NA
    decision_df["CandidateOrderID"] = pd.NA
    decision_df["CandidateSource"] = "none"
    decision_df["DecisionReason"] = ""
    decision_df["Completable"] = False
    decision_df["RequiresFabrication"] = False
    decision_df["PrimaryMatchValidation"] = ""
    return decision_df


def _apply_primary_match(
    decision_df: pd.DataFrame,
    receiver_row: pd.Series,
    donor_row: pd.Series,
    match_type: str,
    reason: str,
) -> None:
    receiver_mask = decision_df["RecordKey"].eq(receiver_row["RecordKey"])
    decision_code = (
        DECISION_CODES["completable_with_additional"]
        if match_type == "additional"
        else DECISION_CODES["completable_with_incomplete"]
        if match_type == "incomplete"
        else DECISION_CODES["available_from_free_stock"]
    )
    decision_label = (
        DECISION_LABELS[DECISION_CODES["completable_with_additional"]]
        if match_type == "additional"
        else DECISION_LABELS[DECISION_CODES["completable_with_incomplete"]]
        if match_type == "incomplete"
        else "Completable con stock libre"
    )
    recommendation = (
        f"Reservar adicional compatible {donor_row['OrderID']}."
        if match_type == "additional"
        else f"Reservar pedido incompleto compatible {donor_row['OrderID']}."
        if match_type == "incomplete"
        else f"Validar y reservar stock libre {donor_row['OrderID']}."
    )
    validation_message = "Requiere validacion comercial" if match_type == "free_stock" else "Compatible para reserva"

    decision_df.loc[receiver_mask, "decision_code"] = decision_code
    decision_df.loc[receiver_mask, "decision_label"] = decision_label
    decision_df.loc[receiver_mask, "candidate_match_type"] = match_type
    decision_df.loc[receiver_mask, "candidate_match_type_label"] = MATCH_TYPE_LABELS[match_type]
    decision_df.loc[receiver_mask, "candidate_match_id"] = donor_row["RecordKey"]
    decision_df.loc[receiver_mask, "candidate_match_orderid"] = donor_row["OrderID"]
    decision_df.loc[receiver_mask, "recommendation"] = recommendation
    decision_df.loc[receiver_mask, "decision_reason"] = reason
    decision_df.loc[receiver_mask, "priority_score"] = PRIORITY_SCORES[match_type]
    decision_df.loc[receiver_mask, "Completable"] = True
    decision_df.loc[receiver_mask, "RequiresFabrication"] = False
    decision_df.loc[receiver_mask, "PrimaryMatchValidation"] = validation_message

    decision_df.loc[receiver_mask, "AvailabilityType"] = decision_label
    decision_df.loc[receiver_mask, "Recommendation"] = recommendation
    decision_df.loc[receiver_mask, "CandidateRecordKey"] = donor_row["RecordKey"]
    decision_df.loc[receiver_mask, "CandidateOrderID"] = donor_row["OrderID"]
    decision_df.loc[receiver_mask, "CandidateSource"] = match_type
    decision_df.loc[receiver_mask, "DecisionReason"] = reason


def build_recommendations(clean_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    decision_df = _default_decision_frame(clean_df)
    donors_df = clean_df.loc[donor_eligibility_mask(clean_df)].copy()
    receivers = sort_receivers(clean_df)
    consumed_donors: set[str] = set()
    matches: list[dict[str, Any]] = []

    for _, receiver_row in receivers.iterrows():
        available_donors = donors_df.loc[~donors_df["RecordKey"].isin(consumed_donors)]
        buckets = candidate_buckets(receiver_row, available_donors)

        receiver_mask = decision_df["RecordKey"].eq(receiver_row["RecordKey"])
        decision_df.loc[receiver_mask, "additional_candidate_count"] = len(buckets["additional"])
        decision_df.loc[receiver_mask, "incomplete_candidate_count"] = len(buckets["incomplete"])
        decision_df.loc[receiver_mask, "free_stock_candidate_count"] = len(buckets["free_stock"])

        combined: list[tuple[str, pd.Series]] = []
        for source_name in PRIMARY_BUCKET_ORDER:
            source_df = buckets[source_name]
            for _, donor_row in source_df.iterrows():
                combined.append((source_name, donor_row))

        # Business priority is explicit: Additional, then Incomplete, then compatible free stock.
        primary_match_type = "none"
        primary_donor: pd.Series | None = None
        for source_name in PRIMARY_BUCKET_ORDER:
            source_df = buckets[source_name]
            if not source_df.empty:
                primary_match_type = source_name
                primary_donor = source_df.iloc[0]
                break

        for overall_rank, (source_name, donor_row) in enumerate(combined, start=1):
            source_df = buckets[source_name]
            rank_within_source = source_df.index.get_loc(donor_row.name) + 1
            matches.append(
                match_row_to_dict(
                    receiver_row=receiver_row,
                    donor_row=donor_row,
                    candidate_source=source_name,
                    rank=rank_within_source,
                    overall_rank=overall_rank,
                    is_primary=bool(primary_donor is not None and donor_row["RecordKey"] == primary_donor["RecordKey"]),
                )
            )

        if primary_donor is not None:
            consumed_donors.add(str(primary_donor["RecordKey"]))
            reason = next(match["explanation"] for match in matches[::-1] if match["is_primary"])
            _apply_primary_match(decision_df, receiver_row, primary_donor, primary_match_type, reason)

    decision_df = classify_all_records(decision_df)
    matches_df = pd.DataFrame(matches, columns=MATCH_COLUMNS)
    return decision_df, matches_df


def classify_all_records(decision_df: pd.DataFrame) -> pd.DataFrame:
    classified = decision_df.copy()

    manual_mask = classified["NeedsManualReview"]
    complete_mask = classified["SetStatus"].eq("Complete") & ~manual_mask
    free_stock_mask = classified["IsFreeStock"] & ~manual_mask & ~complete_mask
    unresolved_incomplete_mask = (
        classified["SetStatus"].eq("Incomplete")
        & ~manual_mask
        & ~classified["Completable"]
        & ~free_stock_mask
        & ~complete_mask
    )
    additional_inventory_mask = classified["SetStatus"].eq("Additionals") & ~manual_mask & ~free_stock_mask & ~complete_mask

    classified.loc[manual_mask, "decision_code"] = DECISION_CODES["manual_review_required"]
    classified.loc[manual_mask, "decision_label"] = DECISION_LABELS[DECISION_CODES["manual_review_required"]]
    classified.loc[manual_mask, "recommendation"] = "Corregir datos antes de tomar una decision comercial."
    classified.loc[manual_mask, "decision_reason"] = classified.loc[manual_mask, "ReviewReasons"].replace(
        "", "Registro excluido del agrupamiento automatico."
    )
    classified.loc[manual_mask, "requires_manual_review"] = True
    classified.loc[manual_mask, "should_manufacture"] = False
    classified.loc[manual_mask, "priority_score"] = pd.NA

    classified.loc[complete_mask, "decision_code"] = DECISION_CODES["available_complete"]
    classified.loc[complete_mask, "decision_label"] = DECISION_LABELS[DECISION_CODES["available_complete"]]
    classified.loc[complete_mask, "recommendation"] = "Disponible para atencion inmediata."
    classified.loc[complete_mask, "decision_reason"] = "El registro ya esta marcado como Complete."
    classified.loc[complete_mask, "priority_score"] = pd.NA

    classified.loc[free_stock_mask, "decision_code"] = DECISION_CODES["available_from_free_stock"]
    classified.loc[free_stock_mask, "decision_label"] = DECISION_LABELS[DECISION_CODES["available_from_free_stock"]]
    classified.loc[free_stock_mask, "recommendation"] = "Mantener disponible para completar pedidos compatibles."
    classified.loc[free_stock_mask, "decision_reason"] = classified.loc[free_stock_mask, "decision_reason"].mask(
        classified.loc[free_stock_mask, "decision_reason"].eq(""),
        "Customer vacio: se trata como stock libre utilizable.",
    )
    classified.loc[free_stock_mask, "candidate_match_type"] = "free_stock"
    classified.loc[free_stock_mask, "candidate_match_type_label"] = MATCH_TYPE_LABELS["free_stock"]
    classified.loc[free_stock_mask, "priority_score"] = pd.NA

    classified.loc[unresolved_incomplete_mask, "decision_code"] = DECISION_CODES["requires_manufacturing"]
    classified.loc[unresolved_incomplete_mask, "decision_label"] = DECISION_LABELS[DECISION_CODES["requires_manufacturing"]]
    classified.loc[unresolved_incomplete_mask, "candidate_match_type"] = "none"
    classified.loc[unresolved_incomplete_mask, "candidate_match_type_label"] = MATCH_TYPE_LABELS["none"]
    classified.loc[unresolved_incomplete_mask, "recommendation"] = "No se encontraron combinaciones validas en inventario."
    classified.loc[unresolved_incomplete_mask, "decision_reason"] = (
        "No se encontraron coincidencias validas; se recomienda fabricacion."
    )
    classified.loc[unresolved_incomplete_mask, "should_manufacture"] = True
    classified.loc[unresolved_incomplete_mask, "priority_score"] = PRIORITY_SCORES["none"]
    classified.loc[unresolved_incomplete_mask, "RequiresFabrication"] = True

    classified.loc[additional_inventory_mask, "decision_code"] = DECISION_CODES["completable_with_additional"]
    classified.loc[additional_inventory_mask, "decision_label"] = "Disponible adicional compatible"
    classified.loc[additional_inventory_mask, "recommendation"] = "Mantener como inventario adicional disponible."
    classified.loc[additional_inventory_mask, "decision_reason"] = (
        "Registro Additional disponible para completar pedidos incompletos compatibles."
    )
    classified.loc[additional_inventory_mask, "candidate_match_type"] = "additional"
    classified.loc[additional_inventory_mask, "candidate_match_type_label"] = MATCH_TYPE_LABELS["additional"]
    classified.loc[additional_inventory_mask, "priority_score"] = pd.NA

    # Sync human-readable aliases used by UI/reporting with the normalized output fields.
    classified["AvailabilityType"] = classified["decision_label"]
    classified["Recommendation"] = classified["recommendation"]
    classified["CandidateRecordKey"] = classified["candidate_match_id"]
    classified["CandidateOrderID"] = classified["candidate_match_orderid"]
    classified["CandidateSource"] = classified["candidate_match_type"]
    classified["DecisionReason"] = classified["decision_reason"]
    classified["RequiresFabrication"] = classified["should_manufacture"]
    classified["requires_manual_review"] = classified["requires_manual_review"].astype(bool)

    classified["CandidateRecordKey"] = classified["CandidateRecordKey"].astype("string")
    classified["CandidateOrderID"] = classified["CandidateOrderID"].astype("string")
    classified["CandidateSource"] = classified["CandidateSource"].astype("string")
    classified["candidate_match_id"] = classified["candidate_match_id"].astype("string")
    classified["candidate_match_orderid"] = classified["candidate_match_orderid"].astype("string")
    classified["candidate_match_type"] = classified["candidate_match_type"].astype("string")
    return classified
