from __future__ import annotations

from collections import Counter
from typing import Any

import pandas as pd

from src.core.config import MATCH_TYPE_LABELS

AGING_BUCKETS = [
    ("0-180", 0, 180),
    ("181-365", 181, 365),
    ("366-730", 366, 730),
    ("731-1095", 731, 1095),
    (">1095", 1096, float("inf")),
]


def _percent(numerator: float, denominator: float) -> float:
    if not denominator:
        return 0.0
    return round((numerator / denominator) * 100, 2)


def _sum_cost(dataframe: pd.DataFrame, mask: pd.Series | None = None) -> float:
    target = dataframe.loc[mask] if mask is not None else dataframe
    return round(float(target["InvoiceCost"].fillna(0).sum()), 2)


def _aging_rows(decision_df: pd.DataFrame) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for label, min_days, max_days in AGING_BUCKETS:
        bucket_mask = decision_df["DaysStored"].between(min_days, max_days, inclusive="both")
        rows.append(
            {
                "label": label,
                "count": int(bucket_mask.sum()),
                "value": _sum_cost(decision_df, bucket_mask),
            }
        )
    return rows


def _quality_issue_rows(decision_df: pd.DataFrame) -> list[dict[str, Any]]:
    rows = [
        {"label": "Customer vacios", "count": int(decision_df["IsFreeStock"].sum())},
        {"label": "Vehicle vacios", "count": int(decision_df["MissingVehicle"].sum())},
        {"label": "Product vacios", "count": int(decision_df["MissingProduct"].sum())},
        {"label": "SetStatus invalidos", "count": int(decision_df["InvalidSetStatus"].sum())},
        {"label": "Created invalidos", "count": int(decision_df["InvalidCreated"].sum())},
        {"label": "Duplicados por ID", "count": int(decision_df["DuplicateID"].sum())},
        {"label": "Duplicados por OrderID", "count": int(decision_df["DuplicateOrderID"].sum())},
        {"label": "Duplicados por Serial", "count": int(decision_df["DuplicateSerial"].sum())},
    ]
    return rows


def build_quality_table(decision_df: pd.DataFrame, matches_df: pd.DataFrame) -> pd.DataFrame:
    auto_groupable_total = int(
        (~decision_df["NeedsManualReview"] & decision_df["SetStatus"].isin(["Incomplete", "Additionals"])).sum()
    )
    excluded_percentage = _percent(int(decision_df["NeedsManualReview"].sum()), len(decision_df))
    metrics = [
        ("Calidad de datos", "Filas totales", int(len(decision_df))),
        ("Calidad de datos", "Customer vacios", int(decision_df["IsFreeStock"].sum())),
        ("Calidad de datos", "Vehicle vacios", int(decision_df["MissingVehicle"].sum())),
        ("Calidad de datos", "Product vacios", int(decision_df["MissingProduct"].sum())),
        ("Calidad de datos", "SetStatus invalidos", int(decision_df["InvalidSetStatus"].sum())),
        ("Calidad de datos", "Duplicados por ID", int(decision_df["DuplicateID"].sum())),
        ("Calidad de datos", "Duplicados por OrderID", int(decision_df["DuplicateOrderID"].sum())),
        ("Calidad de datos", "Duplicados por Serial", int(decision_df["DuplicateSerial"].sum())),
        ("Calidad de datos", "Porcentaje excluido", excluded_percentage),
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
    incomplete_mask = decision_df["SetStatus"].eq("Incomplete")
    free_stock_mask = decision_df["IsFreeStock"]
    manual_review_mask = decision_df["NeedsManualReview"]
    requires_fabrication_mask = decision_df["RequiresFabrication"]
    completable_mask = decision_df["Completable"]

    incomplete_total = int(incomplete_mask.sum())
    free_stock_total = int(free_stock_mask.sum())
    manual_review_total = int(manual_review_mask.sum())
    missing_vehicle_total = int(decision_df["MissingVehicle"].sum())
    completable_total = int(completable_mask.sum())
    requires_fabrication_total = int(requires_fabrication_mask.sum())
    auto_groupable_total = int(
        (~manual_review_mask & decision_df["SetStatus"].isin(["Incomplete", "Additionals"])).sum()
    )

    complete_total = int(decision_df["SetStatus"].eq("Complete").sum())
    additionals_total = int(decision_df["SetStatus"].eq("Additionals").sum())
    average_days_stored = round(float(decision_df["DaysStored"].mean()), 1) if total_rows else 0.0

    total_inventory_value = _sum_cost(decision_df)
    free_stock_value = _sum_cost(decision_df, free_stock_mask)
    completable_value = _sum_cost(decision_df, completable_mask)
    manufacturing_value = _sum_cost(decision_df, requires_fabrication_mask)
    reserved_gap_value = _sum_cost(decision_df, incomplete_mask & ~completable_mask & ~manual_review_mask)

    quality_issue_rows = _quality_issue_rows(decision_df)
    aging_rows = _aging_rows(decision_df)

    combination_counter: Counter[str] = Counter()
    if not matches_df.empty:
        grouped = matches_df.groupby(["receiver_product", "receiver_vehicle", "candidate_match_type"]).size()
        for (product, vehicle, match_type), value in grouped.items():
            combination_counter[f"{product} | {vehicle} | {MATCH_TYPE_LABELS.get(match_type, match_type)}"] = int(value)

    top_oldest_free_stock = (
        decision_df.loc[free_stock_mask & ~decision_df["SetStatus"].eq("Complete")]
        .sort_values(by=["DaysStored", "Product", "Vehicle"], ascending=[False, True, True])
        .loc[:, ["OrderID", "Product", "Vehicle", "DaysStored", "SetStatusLabel", "InvoiceCost"]]
        .head(10)
        .fillna("")
        .to_dict(orient="records")
    )

    top_requires_fabrication = (
        decision_df.loc[requires_fabrication_mask]
        .sort_values(by=["DaysStored", "InvoiceCost"], ascending=[False, False])
        .loc[:, ["OrderID", "Product", "Vehicle", "Customer", "DaysStored", "InvoiceCost"]]
        .head(10)
        .fillna("")
        .to_dict(orient="records")
    )

    top_critical_products = (
        decision_df.loc[(free_stock_mask | requires_fabrication_mask) & decision_df["Product"].notna()]
        .groupby("Product", dropna=True)
        .agg(
            records=("RecordKey", "count"),
            max_days=("DaysStored", "max"),
            total_value=("InvoiceCost", "sum"),
        )
        .reset_index()
        .sort_values(by=["max_days", "records", "total_value"], ascending=[False, False, False])
        .head(10)
        .rename(columns={"Product": "product"})
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

    additional_match_total = int(decision_df["candidate_match_type"].eq("additional").sum())
    incomplete_match_total = int(decision_df["candidate_match_type"].eq("incomplete").sum())
    free_stock_match_total = int(decision_df["candidate_match_type"].eq("free_stock").sum())
    incomplete_manual_review_total = int((incomplete_mask & manual_review_mask).sum())

    resolution_mix = [
        {"label": "Revision manual", "count": incomplete_manual_review_total},
        {"label": MATCH_TYPE_LABELS["additional"], "count": additional_match_total},
        {"label": MATCH_TYPE_LABELS["incomplete"], "count": incomplete_match_total},
        {"label": MATCH_TYPE_LABELS["free_stock"], "count": free_stock_match_total},
        {"label": "Requiere fabricacion", "count": requires_fabrication_total},
    ]

    executive_headline = (
        f"{_percent(completable_total, incomplete_total)}% de los pedidos incompletos presenta oportunidad de resolucion con inventario existente."
        if incomplete_total
        else "No hay pedidos incompletos en el lote procesado."
    )

    executive_highlights = [
        {
            "title": "Oportunidad principal",
            "text": f"{completable_total} pedidos incompletos tienen una ruta sugerida de resolucion antes de fabricar.",
        },
        {
            "title": "Riesgo de datos",
            "text": f"{manual_review_total} registros requieren revision manual antes de entrar al motor automatico.",
        },
        {
            "title": "Dependencia de fabricacion",
            "text": f"{_percent(requires_fabrication_total, incomplete_total)}% de los incompletos aun depende de fabricacion.",
        },
    ]

    chart_notes = {
        "composition": "La mezcla entre completos, incompletos y adicionales muestra donde existe oportunidad inmediata de reorganizacion.",
        "resolution": "La resolucion de incompletos deja ver cuanto depende AGP de Additional, de otros incompletos o de stock libre.",
        "aging": "Los tramos de antiguedad ayudan a priorizar inventario inmovilizado y riesgo de obsolescencia.",
        "pareto": "Las combinaciones de mayor frecuencia concentran la mayor oportunidad de accion comercial y operativa.",
        "critical_products": "Los productos mas antiguos o mas expuestos merecen revisarse primero para evitar inmovilizacion adicional.",
        "waterfall": "La secuencia de decision resume que parte del universo incompleto termina en revision, resolucion por inventario o fabricacion.",
    }

    return {
        "generated_at": pd.Timestamp.now().isoformat(),
        "total_records": int(total_rows),
        "complete_total": complete_total,
        "incomplete_total": incomplete_total,
        "additionals_total": additionals_total,
        "free_stock_total": free_stock_total,
        "manual_review_total": manual_review_total,
        "missing_vehicle_total": missing_vehicle_total,
        "missing_product_total": int(decision_df["MissingProduct"].sum()),
        "auto_groupable_total": auto_groupable_total,
        "completable_total": completable_total,
        "requires_fabrication_total": requires_fabrication_total,
        "oldest_days_stored": int(decision_df["DaysStored"].max() if total_rows else 0),
        "average_days_stored": average_days_stored,
        "free_stock_percentage": _percent(free_stock_total, total_rows),
        "inventory_reduction_opportunity_percentage": _percent(completable_total, incomplete_total),
        "completable_over_total_percentage": _percent(completable_total, total_rows),
        "manufacturing_dependency_percentage": _percent(requires_fabrication_total, incomplete_total),
        "excluded_percentage": _percent(manual_review_total, total_rows),
        "automatic_eligibility_percentage": _percent(auto_groupable_total, total_rows),
        "operational_quality_index": round(100 - _percent(manual_review_total, total_rows), 2),
        "stock_free_coverage_percentage": _percent(free_stock_match_total, incomplete_total),
        "inventory_utilization_percentage": _percent(complete_total + completable_total, total_rows),
        "total_inventory_value": total_inventory_value,
        "free_stock_value": free_stock_value,
        "potential_usable_value": round(completable_value + free_stock_value, 2),
        "requires_manufacturing_value": manufacturing_value,
        "reserved_gap_value": reserved_gap_value,
        "set_status_counts": {str(key): int(value) for key, value in set_status_counts.items()},
        "availability_counts": {str(key): int(value) for key, value in availability_counts.items()},
        "match_type_counts": {
            MATCH_TYPE_LABELS["additional"]: additional_match_total,
            MATCH_TYPE_LABELS["incomplete"]: incomplete_match_total,
            MATCH_TYPE_LABELS["free_stock"]: free_stock_match_total,
        },
        "resolution_mix": resolution_mix,
        "aging_buckets": aging_rows,
        "quality_issue_rows": quality_issue_rows,
        "top_oldest_free_stock": top_oldest_free_stock,
        "top_requires_fabrication": top_requires_fabrication,
        "top_critical_products": top_critical_products,
        "top_combinations": top_combinations,
        "review_rows": (
            decision_df.loc[manual_review_mask, ["RecordKey", "OrderID", "Vehicle", "Product", "ReviewReasons"]]
            .head(20)
            .fillna("")
            .to_dict(orient="records")
        ),
        "executive_headline": executive_headline,
        "executive_highlights": executive_highlights,
        "chart_notes": chart_notes,
    }
