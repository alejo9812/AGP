from __future__ import annotations

from typing import Any

import pandas as pd

from src.core.config import MAX_CANDIDATES_PER_BUCKET


def receiver_eligibility_mask(dataframe: pd.DataFrame) -> pd.Series:
    return (
        dataframe["SetStatus"].eq("Incomplete")
        & ~dataframe["NeedsManualReview"]
        & dataframe["Customer"].notna()
        & dataframe["Vehicle"].notna()
        & dataframe["Product"].notna()
    )


def donor_eligibility_mask(dataframe: pd.DataFrame) -> pd.Series:
    return (
        dataframe["SetStatus"].isin(["Incomplete", "Additionals"])
        & ~dataframe["NeedsManualReview"]
        & dataframe["Vehicle"].notna()
        & dataframe["Product"].notna()
    )


def build_candidate_sort_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    enriched = dataframe.copy()
    enriched["CreatedSort"] = pd.to_datetime(enriched["Created"], errors="coerce").fillna(pd.Timestamp.max)
    enriched["IDSort"] = enriched["ID"].fillna("ZZZZZZ")
    return enriched


def sort_receivers(dataframe: pd.DataFrame) -> pd.DataFrame:
    receivers = build_candidate_sort_columns(dataframe.loc[receiver_eligibility_mask(dataframe)])
    return receivers.sort_values(by=["DaysStored", "CreatedSort", "IDSort"], ascending=[False, True, True])


def sort_candidates(dataframe: pd.DataFrame) -> pd.DataFrame:
    candidates = build_candidate_sort_columns(dataframe)
    return candidates.sort_values(by=["DaysStored", "CreatedSort", "IDSort"], ascending=[False, True, True]).head(
        MAX_CANDIDATES_PER_BUCKET
    )


def candidate_buckets(receiver_row: pd.Series, donors_df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    compatible = donors_df.loc[
        donors_df["Vehicle"].eq(receiver_row["Vehicle"])
        & donors_df["Product"].eq(receiver_row["Product"])
        & donors_df["RecordKey"].ne(receiver_row["RecordKey"])
    ]
    same_customer = compatible.loc[compatible["Customer"].eq(receiver_row["Customer"])].copy()
    additional = same_customer.loc[same_customer["SetStatus"].eq("Additionals")]
    incomplete = same_customer.loc[same_customer["SetStatus"].eq("Incomplete")]
    free_stock = compatible.loc[compatible["IsFreeStock"]]
    return {
        "additional": sort_candidates(additional),
        "incomplete": sort_candidates(incomplete),
        "free_stock": sort_candidates(free_stock),
    }


def build_candidate_explanation(receiver_row: pd.Series, donor_row: pd.Series, candidate_source: str) -> str:
    if candidate_source == "additional":
        return (
            "Pedido incompleto completable con inventario adicional compatible del mismo cliente, "
            f"vehiculo y producto. Se prioriza por antiguedad ({int(donor_row['DaysStored'])} dias)."
        )
    if candidate_source == "incomplete":
        return (
            "Pedido incompleto completable con otro pedido incompleto compatible del mismo cliente, "
            f"vehiculo y producto. Se prioriza por antiguedad ({int(donor_row['DaysStored'])} dias)."
        )
    return (
        f"Pedido incompleto apoyado por stock libre compatible en Vehicle={receiver_row['Vehicle']} y Product={receiver_row['Product']}. "
        f"Se propone el registro con {int(donor_row['DaysStored'])} dias almacenados y requiere validacion comercial."
    )


def match_row_to_dict(
    receiver_row: pd.Series,
    donor_row: pd.Series,
    candidate_source: str,
    rank: int,
    overall_rank: int,
    is_primary: bool,
) -> dict[str, Any]:
    return {
        "receiver_record_key": receiver_row["RecordKey"],
        "receiver_order_id": receiver_row["OrderID"],
        "receiver_customer": receiver_row["Customer"],
        "receiver_vehicle": receiver_row["Vehicle"],
        "receiver_product": receiver_row["Product"],
        "receiver_days_stored": int(receiver_row["DaysStored"]),
        "donor_record_key": donor_row["RecordKey"],
        "donor_source_id": donor_row["ID"],
        "donor_order_id": donor_row["OrderID"],
        "donor_customer": donor_row["Customer"] if pd.notna(donor_row["Customer"]) else "Stock libre",
        "donor_vehicle": donor_row["Vehicle"],
        "donor_product": donor_row["Product"],
        "donor_days_stored": int(donor_row["DaysStored"]),
        "donor_set_status": donor_row["SetStatus"],
        "candidate_match_type": candidate_source,
        "rank_within_source": rank,
        "rank_overall": overall_rank,
        "is_primary": is_primary,
        "explanation": build_candidate_explanation(receiver_row, donor_row, candidate_source),
    }
