from __future__ import annotations

from collections import Counter
from typing import Any

import pandas as pd

from src.core.config import MATCH_TYPE_LABELS, SET_STATUS_LABELS


def build_quality_table(decision_df: pd.DataFrame, matches_df: pd.DataFrame) -> pd.DataFrame:
    auto_groupable_total = int(
        (~decision_df["NeedsManualReview"] & decision_df["SetStatus"].isin(["Incomplete", "Additionals"])).sum()
    )
    metrics = [
        ("Calidad de datos", "Filas totales", int(len(decision_df))),
        ("Calidad de datos", "Customer vacios", int(decision_df["IsFreeStock"].sum())),
        ("Calidad de datos", "Vehicle vacios", int(decision_df["MissingVehicle"].sum())),
        ("Calidad de datos", "Product vacios", int(decision_df["MissingProduct"].sum())),
        ("Calidad de datos", "SetStatus invalidos", int(decision_df["InvalidSetStatus"].sum())),
        ("Calidad de datos", "Duplicados por ID", int(decision_df["DuplicateID"].sum())),
        ("Calidad de datos", "Duplicados por OrderID", int(decision_df["DuplicateOrderID"].sum())),
        ("Calidad de datos", "Duplicados por Serial", int(decision_df["DuplicateSerial"].sum())),
        ("Clasificacion", "Completo", int(decision_df["SetStatus"].eq("Complete").sum())),
        ("Clasificacion", "Incompleto", int(decision_df["SetStatus"].eq("Incomplete").sum())),
        ("Clasificacion", "Adicionales", int(decision_df["SetStatus"].eq("Additionals").sum())),
        ("Clasificacion", "Stock libre", int(decision_df["IsFreeStock"].sum())),
        ("Clasificacion", "Aptos para agrupacion automatica", auto_groupable_total),
        ("Agrupamiento", "Pedidos completables", int(decision_df["Completable"].sum())),
        ("Agrupamiento", "Pedidos que requieren fabricacion", int(decision_df["RequiresFabrication"].sum())),
        ("Agrupamiento", "Matches Additional", int(decision_df["candidate_match_type"].eq("additional").sum())),
        ("Agrupamiento", "Matches Incomplete", int(decision_df["candidate_match_type"].eq("incomplete").sum())),
        ("Agrupamiento", "Matches Free Stock", int(decision_df["candidate_match_type"].eq("free_stock").sum())),
        ("Agrupamiento", "Recomendaciones generadas", int(matches_df["receiver_record_key"].nunique() if not matches_df.empty else 0)),
    ]
    return pd.DataFrame(metrics, columns=["Category", "Metric", "Value"])


def build_summary(decision_df: pd.DataFrame, matches_df: pd.DataFrame) -> dict[str, Any]:
    total_rows = len(decision_df)
    free_stock_total = int(decision_df["IsFreeStock"].sum())
    incomplete_total = int(decision_df["SetStatus"].eq("Incomplete").sum())
    manual_review_total = int(decision_df["NeedsManualReview"].sum())
    missing_vehicle_total = int(decision_df["MissingVehicle"].sum())
    completable_total = int(decision_df["Completable"].sum())
    requires_fabrication_total = int(decision_df["RequiresFabrication"].sum())
    auto_groupable_total = int(
        (~decision_df["NeedsManualReview"] & decision_df["SetStatus"].isin(["Incomplete", "Additionals"])).sum()
    )

    combination_counter: Counter[str] = Counter()
    if not matches_df.empty:
        grouped = matches_df.groupby(["receiver_product", "receiver_vehicle", "candidate_match_type"]).size()
        for (product, vehicle, match_type), value in grouped.items():
            match_label = MATCH_TYPE_LABELS.get(match_type, str(match_type))
            combination_counter[f"{product} | {vehicle} | {match_label}"] = int(value)

    top_oldest_free_stock = (
        decision_df.loc[decision_df["IsFreeStock"]]
        .sort_values(by=["DaysStored", "Product", "Vehicle"], ascending=[False, True, True])
        .loc[:, ["OrderID", "Product", "Vehicle", "DaysStored", "SetStatusLabel"]]
        .head(10)
        .fillna("")
        .to_dict(orient="records")
    )

    top_fabrication = (
        decision_df.loc[decision_df["RequiresFabrication"]]
        .sort_values(by=["DaysStored", "Product", "Vehicle"], ascending=[False, True, True])
        .loc[:, ["OrderID", "Product", "Vehicle", "Customer", "DaysStored"]]
        .head(10)
        .fillna("")
        .to_dict(orient="records")
    )

    top_combinations = [
        {"combination": combination, "count": count}
        for combination, count in combination_counter.most_common(10)
    ]

    availability_counts = (
        decision_df.groupby("decision_label")["RecordKey"].count().sort_values(ascending=False).to_dict()
    )
    set_status_counts = (
        decision_df.groupby("SetStatusLabel")["RecordKey"].count().sort_values(ascending=False).to_dict()
    )

    return {
        "generated_at": pd.Timestamp.now().isoformat(),
        "total_records": int(total_rows),
        "complete_total": int(decision_df["SetStatus"].eq("Complete").sum()),
        "incomplete_total": incomplete_total,
        "additionals_total": int(decision_df["SetStatus"].eq("Additionals").sum()),
        "free_stock_total": free_stock_total,
        "manual_review_total": manual_review_total,
        "missing_vehicle_total": missing_vehicle_total,
        "auto_groupable_total": auto_groupable_total,
        "completable_total": completable_total,
        "requires_fabrication_total": requires_fabrication_total,
        "oldest_days_stored": int(decision_df["DaysStored"].max() if total_rows else 0),
        "free_stock_percentage": round((free_stock_total / total_rows) * 100, 2) if total_rows else 0.0,
        "inventory_reduction_opportunity_percentage": round((completable_total / incomplete_total) * 100, 2)
        if incomplete_total
        else 0.0,
        "set_status_counts": {str(key): int(value) for key, value in set_status_counts.items()},
        "availability_counts": {str(key): int(value) for key, value in availability_counts.items()},
        "match_type_counts": {
            MATCH_TYPE_LABELS["additional"]: int(decision_df["candidate_match_type"].eq("additional").sum()),
            MATCH_TYPE_LABELS["incomplete"]: int(decision_df["candidate_match_type"].eq("incomplete").sum()),
            MATCH_TYPE_LABELS["free_stock"]: int(decision_df["candidate_match_type"].eq("free_stock").sum()),
        },
        "top_oldest_free_stock": top_oldest_free_stock,
        "top_requires_fabrication": top_fabrication,
        "top_combinations": top_combinations,
        "review_rows": (
            decision_df.loc[decision_df["NeedsManualReview"], ["RecordKey", "OrderID", "Vehicle", "Product", "ReviewReasons"]]
            .head(20)
            .fillna("")
            .to_dict(orient="records")
        ),
    }
