from __future__ import annotations

import json
import os
from pathlib import Path

import pandas as pd
import streamlit as st

from src.core.config import MATCH_TYPE_LABELS
from src.utils.paths import LATEST_MANIFEST_PATH

VISIBLE_COLUMNS = [
    "OrderID",
    "VehicleLabel",
    "ProductLabel",
    "CustomerDisplay",
    "DaysStored",
    "SetStatusLabel",
    "decision_label",
    "candidate_match_type_label",
]
VISIBLE_LABELS = {
    "OrderID": "Pedido",
    "VehicleLabel": "Vehiculo",
    "ProductLabel": "Producto",
    "CustomerDisplay": "Cliente",
    "DaysStored": "Dias almacenado",
    "SetStatusLabel": "Estado del set",
    "decision_label": "Decision",
    "candidate_match_type_label": "Tipo de match",
}
BOOL_COLUMNS = [
    "IsFreeStock",
    "NeedsManualReview",
    "Completable",
    "RequiresFabrication",
    "requires_manual_review",
    "should_manufacture",
    "MissingVehicle",
    "MissingProduct",
    "InvalidSetStatus",
    "InvalidCreated",
    "DuplicateID",
    "DuplicateOrderID",
    "DuplicateSerial",
]


def _manifest_path() -> Path:
    override = os.environ.get("AGP_MVP_MANIFEST_PATH")
    return Path(override) if override else LATEST_MANIFEST_PATH


@st.cache_data(show_spinner=False)
def load_run_data(manifest_path: str) -> tuple[dict, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    detail_df = pd.read_csv(manifest["output_paths"]["detail_csv"], keep_default_na=False)
    matches_df = pd.read_csv(manifest["output_paths"]["matches_csv"], keep_default_na=False)
    quality_df = pd.read_csv(manifest["output_paths"]["quality_csv"], keep_default_na=False)

    for column in BOOL_COLUMNS:
        if column in detail_df.columns:
            detail_df[column] = detail_df[column].astype(str).str.lower().eq("true")

    if "Created" in detail_df.columns:
        detail_df["Created"] = pd.to_datetime(detail_df["Created"], errors="coerce")

    detail_df["VehicleLabel"] = detail_df["Vehicle"].replace("", "Revision manual")
    detail_df["ProductLabel"] = detail_df["Product"].replace("", "Producto invalido")
    detail_df["candidate_match_type_label"] = detail_df["candidate_match_type_label"].replace("", MATCH_TYPE_LABELS["none"])
    return manifest, detail_df, matches_df, quality_df


def apply_filters(detail_df: pd.DataFrame) -> pd.DataFrame:
    st.sidebar.header("Filtros")
    search = st.sidebar.text_input("Buscador principal", placeholder="Pedido, vehiculo, producto, cliente o serial")

    vehicle_options = ["Todos"] + sorted([item for item in detail_df["VehicleLabel"].dropna().unique().tolist() if item])
    product_options = ["Todos"] + sorted([item for item in detail_df["ProductLabel"].dropna().unique().tolist() if item])
    customer_options = ["Todos"] + sorted([item for item in detail_df["CustomerDisplay"].dropna().unique().tolist() if item])
    status_options = ["Todos"] + sorted([item for item in detail_df["SetStatusLabel"].dropna().unique().tolist() if item])
    decision_options = ["Todas"] + sorted([item for item in detail_df["decision_label"].dropna().unique().tolist() if item])
    yes_no = ["Todos", "Si", "No"]

    vehicle = st.sidebar.selectbox("Vehiculo", vehicle_options)
    product = st.sidebar.selectbox("Producto", product_options)
    customer = st.sidebar.selectbox("Cliente", customer_options)
    set_status = st.sidebar.selectbox("Estado del set", status_options)
    decision = st.sidebar.selectbox("Decision", decision_options)
    free_stock = st.sidebar.selectbox("Stock libre", yes_no)
    completable = st.sidebar.selectbox("Completable automaticamente", yes_no)
    requires_fabrication = st.sidebar.selectbox("Requiere fabricacion", yes_no)

    filtered = detail_df.copy()
    if search:
        haystack = (
            filtered["OrderID"].fillna("")
            + " "
            + filtered["VehicleLabel"].fillna("")
            + " "
            + filtered["ProductLabel"].fillna("")
            + " "
            + filtered["CustomerDisplay"].fillna("")
            + " "
            + filtered["Serial"].fillna("")
        ).str.lower()
        filtered = filtered.loc[haystack.str.contains(search.lower(), na=False)]
    if vehicle != "Todos":
        filtered = filtered.loc[filtered["VehicleLabel"].eq(vehicle)]
    if product != "Todos":
        filtered = filtered.loc[filtered["ProductLabel"].eq(product)]
    if customer != "Todos":
        filtered = filtered.loc[filtered["CustomerDisplay"].eq(customer)]
    if set_status != "Todos":
        filtered = filtered.loc[filtered["SetStatusLabel"].eq(set_status)]
    if decision != "Todas":
        filtered = filtered.loc[filtered["decision_label"].eq(decision)]
    if free_stock != "Todos":
        filtered = filtered.loc[filtered["IsFreeStock"].eq(free_stock == "Si")]
    if completable != "Todos":
        filtered = filtered.loc[filtered["Completable"].eq(completable == "Si")]
    if requires_fabrication != "Todos":
        filtered = filtered.loc[filtered["should_manufacture"].eq(requires_fabrication == "Si")]
    return filtered


def render_kpis(summary: dict) -> None:
    labels = [
        ("Total de registros", summary["total_records"]),
        ("Completo", summary["complete_total"]),
        ("Incompleto", summary["incomplete_total"]),
        ("Adicionales", summary["additionals_total"]),
        ("Stock libre", summary["free_stock_total"]),
        ("Vehicle vacio", summary["missing_vehicle_total"]),
        ("Completables", summary["completable_total"]),
        ("Requieren fabricacion", summary["requires_fabrication_total"]),
    ]
    columns = st.columns(4)
    for index, (label, value) in enumerate(labels):
        target = columns[index % 4]
        target.metric(label, value)


def render_detail(selected_row: pd.Series, matches_df: pd.DataFrame) -> None:
    st.subheader("Detalle de decision")
    left, right = st.columns([1.2, 1])

    with left:
        original_data = {
            column.replace("Original_", ""): selected_row.get(column, "")
            for column in selected_row.index
            if column.startswith("Original_")
        }
        st.markdown("**Datos originales**")
        st.json(original_data, expanded=False)

    with right:
        detail_lines = {
            "Decision": selected_row["decision_label"],
            "Estado del set": selected_row["SetStatusLabel"],
            "Stock libre": "Si" if selected_row["IsFreeStock"] else "No",
            "Completable": "Si" if selected_row["Completable"] else "No",
            "Requiere fabricacion": "Si" if selected_row["should_manufacture"] else "No",
            "Revision manual": "Si" if selected_row["requires_manual_review"] else "No",
            "Tipo de match": selected_row.get("candidate_match_type_label", "") or "-",
            "Pedido candidato": selected_row.get("candidate_match_orderid", "") or "-",
            "Ranking": selected_row.get("priority_score", "") or "-",
            "Motivo": selected_row["decision_reason"],
            "Recomendacion": selected_row["recommendation"],
        }
        st.markdown("**Resultado comercial**")
        st.table(pd.DataFrame(detail_lines.items(), columns=["Campo", "Valor"]))

    receiver_matches = matches_df.loc[matches_df["receiver_record_key"].eq(selected_row["RecordKey"])].copy()
    if not receiver_matches.empty:
        receiver_matches["Tipo de match"] = receiver_matches["candidate_match_type"].map(MATCH_TYPE_LABELS)
        receiver_matches["Es principal"] = receiver_matches["is_primary"].map({True: "Si", False: "No"})

    st.markdown("**Compatibilidades detectadas**")
    if receiver_matches.empty:
        st.info("No hay candidatos compatibles para este registro.")
    else:
        st.dataframe(
            receiver_matches.loc[
                :,
                [
                    "donor_order_id",
                    "donor_customer",
                    "donor_vehicle",
                    "donor_product",
                    "donor_days_stored",
                    "Tipo de match",
                    "Es principal",
                    "explanation",
                ],
            ].rename(
                columns={
                    "donor_order_id": "Pedido donante",
                    "donor_customer": "Cliente donante",
                    "donor_vehicle": "Vehiculo",
                    "donor_product": "Producto",
                    "donor_days_stored": "Dias almacenado",
                    "explanation": "Explicacion",
                }
            ),
            use_container_width=True,
            hide_index=True,
        )


def main() -> None:
    st.set_page_config(page_title="AGP MVP Local", layout="wide")
    st.title("MVP local de agrupamiento AGP")
    manifest_path = _manifest_path()
    if not manifest_path.exists():
        st.error("No existe un manifiesto de ejecucion. Ejecuta primero main.py o run_agp_mvp.cmd dentro de esta carpeta.")
        return

    manifest, detail_df, matches_df, _quality_df = load_run_data(str(manifest_path))
    summary = manifest["summary"]

    st.caption(f"Fuente: {manifest['source_file_name']} | Generado: {manifest['generated_at']}")
    render_kpis(summary)

    filtered = apply_filters(detail_df)
    st.subheader("Tabla principal")
    main_table = filtered.loc[:, VISIBLE_COLUMNS].rename(columns=VISIBLE_LABELS)
    st.dataframe(main_table, use_container_width=True, hide_index=True)

    csv_bytes = filtered.to_csv(index=False, encoding="utf-8-sig").encode("utf-8-sig")
    st.download_button("Descargar CSV filtrado", data=csv_bytes, file_name="resultado_agp_filtrado.csv", mime="text/csv")

    if filtered.empty:
        st.info("No hay registros con los filtros actuales.")
        return

    selector_options = filtered["RecordKey"].tolist()
    selected_key = st.selectbox("Selecciona un registro para ver detalle", selector_options)
    selected_row = filtered.loc[filtered["RecordKey"].eq(selected_key)].iloc[0]
    render_detail(selected_row, matches_df)

    pdf_path = Path(manifest["output_paths"]["pdf_report"])
    if pdf_path.exists():
        st.download_button(
            "Descargar PDF ejecutivo",
            data=pdf_path.read_bytes(),
            file_name=pdf_path.name,
            mime="application/pdf",
        )


if __name__ == "__main__":
    main()
