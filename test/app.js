const state = {
  summary: null,
  records: [],
  filteredRecords: [],
  page: 1,
  pageSize: 18,
  sort: { key: "days_stored", direction: "desc" },
  search: "",
  filters: {
    vehicle: "all",
    product: "all",
    customer: "all",
    setStatus: "all",
    freeStockOnly: false,
    completableOnly: false,
    fabricationOnly: false,
  },
  selectedKeys: new Set(),
  activeKey: null,
};

const tableColumns = [
  { key: "order_id", label: "OrderID", sortable: true },
  { key: "vehicle_display", label: "Vehicle", sortable: true },
  { key: "product_display", label: "Product", sortable: true },
  { key: "customer_display", label: "Customer", sortable: true },
  { key: "days_stored", label: "DaysStored", sortable: true },
  { key: "set_status_label", label: "SetStatus", sortable: true, badge: "status" },
  { key: "availability_status", label: "availability_status", sortable: true, badge: "availability" },
  { key: "recommendation", label: "recommendation", sortable: false },
  { key: "candidate_match_orderid", label: "candidate_match_orderid", sortable: true },
  { key: "decision_reason", label: "decision_reason", sortable: false },
];

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadData();
});

async function loadData() {
  try {
    const [summary, results] = await Promise.all([
      loadPayload("./data/resumen.json", "resumen"),
      loadPayload("./data/resultados.json", "resultados"),
    ]);

    state.summary = summary;
    state.records = Array.isArray(results) ? results : [];
    state.filteredRecords = [...state.records];
    state.activeKey = state.records[0]?.record_key ?? null;

    populateFilters();
    renderAll();
  } catch (error) {
    renderFatalError(error);
  }
}

async function loadPayload(path, fallbackKey) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${path}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    const fallback = window.__AGP_PRUEBAS__?.[fallbackKey];
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

function bindEvents() {
  document.getElementById("search-input").addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    state.page = 1;
    renderAll();
  });

  document.getElementById("vehicle-filter").addEventListener("change", (event) => {
    state.filters.vehicle = event.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("product-filter").addEventListener("change", (event) => {
    state.filters.product = event.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("customer-filter").addEventListener("change", (event) => {
    state.filters.customer = event.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("status-filter").addEventListener("change", (event) => {
    state.filters.setStatus = event.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("free-stock-toggle").addEventListener("change", (event) => {
    state.filters.freeStockOnly = event.target.checked;
    state.page = 1;
    renderAll();
  });

  document.getElementById("completable-toggle").addEventListener("change", (event) => {
    state.filters.completableOnly = event.target.checked;
    state.page = 1;
    renderAll();
  });

  document.getElementById("fabrication-toggle").addEventListener("change", (event) => {
    state.filters.fabricationOnly = event.target.checked;
    state.page = 1;
    renderAll();
  });

  document.getElementById("page-size-select").addEventListener("change", (event) => {
    state.pageSize = Number(event.target.value);
    state.page = 1;
    renderTable();
  });

  document.getElementById("clear-filters").addEventListener("click", () => {
    state.search = "";
    state.filters = {
      vehicle: "all",
      product: "all",
      customer: "all",
      setStatus: "all",
      freeStockOnly: false,
      completableOnly: false,
      fabricationOnly: false,
    };
    state.page = 1;
    resetFilterControls();
    renderAll();
  });

  document.getElementById("select-visible").addEventListener("click", () => {
    getCurrentPageRows().forEach((record) => state.selectedKeys.add(record.record_key));
    renderTable();
  });

  document.getElementById("clear-selection").addEventListener("click", () => {
    state.selectedKeys.clear();
    renderTable();
  });

  document.getElementById("prev-page").addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      renderTable();
    }
  });

  document.getElementById("next-page").addEventListener("click", () => {
    const totalPages = getTotalPages();
    if (state.page < totalPages) {
      state.page += 1;
      renderTable();
    }
  });
}

function renderAll() {
  applyFiltersAndSorting();
  ensureActiveRecord();
  renderHeader();
  renderSummary();
  renderTable();
  renderDetail();
}

function renderHeader() {
  if (!state.summary) {
    return;
  }

  document.getElementById("meta-source-file").textContent = state.summary.source_file_name ?? "-";
  document.getElementById("meta-generated-at").textContent = state.summary.generated_at_display ?? "-";
  document.getElementById("summary-note").textContent = [
    `${formatInteger(state.summary.kpis?.total_inventory)} registros analizados`,
    `${formatInteger(state.summary.oldest_days_stored)} dias maximos en bodega`,
    `${formatPercent(state.summary.free_stock_percentage)} de stock libre`,
  ].join(" | ");
}

function renderSummary() {
  const kpiGrid = document.getElementById("kpi-grid");
  const kpis = state.summary?.kpis ?? {};
  const cards = [
    { label: "Total inventario", value: kpis.total_inventory, note: "Registros limpios evaluados" },
    { label: "Complete", value: kpis.complete, note: "Disponibles completos en stock" },
    { label: "Incomplete", value: kpis.incomplete, note: "Pendientes de completar" },
    { label: "Additionals", value: kpis.additionals, note: "Posibles donantes en inventario" },
    { label: "Stock libre", value: kpis.stock_libre, note: "Customer vacio, reservable con validacion" },
    { label: "Completables", value: kpis.completables, note: "Tienen match sugerido" },
    { label: "Requieren fabricacion", value: kpis.requieren_fabricacion, note: "No hay compatibilidad valida" },
    { label: "Revision manual", value: kpis.revision_manual, note: "Datos con bloqueo o inconsistencia" },
  ];

  kpiGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="kpi-card">
          <p>${escapeHtml(card.label)}</p>
          <strong>${formatInteger(card.value)}</strong>
          <p>${escapeHtml(card.note)}</p>
        </article>
      `,
    )
    .join("");
}

function renderTable() {
  renderTableHead();
  renderTableBody();

  document.getElementById("visible-count").textContent = `${formatInteger(state.filteredRecords.length)} visibles`;
  document.getElementById("selected-count").textContent = `${formatInteger(state.selectedKeys.size)} seleccionadas`;
  document.getElementById("result-count").textContent = `${formatInteger(state.filteredRecords.length)} registros visibles`;

  const totalPages = getTotalPages();
  document.getElementById("pagination-summary").textContent = `Pagina ${state.page} de ${totalPages}`;
  document.getElementById("prev-page").disabled = state.page <= 1;
  document.getElementById("next-page").disabled = state.page >= totalPages;
}

function renderTableHead() {
  const head = document.getElementById("results-head");
  const headerCells = tableColumns
    .map((column) => {
      const sortIndicator =
        state.sort.key === column.key ? `<span class="sort-indicator">${state.sort.direction === "asc" ? "↑" : "↓"}</span>` : "";
      const label = escapeHtml(column.label);
      const content = column.sortable
        ? `<button class="sort-button" data-sort-key="${column.key}" type="button">${label}${sortIndicator}</button>`
        : label;
      return `<th scope="col">${content}</th>`;
    })
    .join("");

  head.innerHTML = `
    <tr>
      <th class="selection-cell" scope="col">Sel</th>
      ${headerCells}
    </tr>
  `;

  head.querySelectorAll("[data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleSort(button.dataset.sortKey);
    });
  });
}

function renderTableBody() {
  const body = document.getElementById("results-body");
  const pageRows = getCurrentPageRows();

  if (!pageRows.length) {
    body.innerHTML = `
      <tr class="empty-row">
        <td colspan="${tableColumns.length + 1}">No hay registros con los filtros actuales.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = pageRows
    .map((record) => {
      const isSelected = state.selectedKeys.has(record.record_key);
      const isActive = state.activeKey === record.record_key;
      const rowClasses = [isSelected ? "is-selected" : "", isActive ? "is-active" : ""]
        .filter(Boolean)
        .join(" ");

      return `
        <tr class="${rowClasses}" data-record-key="${record.record_key}">
          <td class="selection-cell">
            <input class="checkbox" data-select-key="${record.record_key}" type="checkbox" ${isSelected ? "checked" : ""} />
          </td>
          ${tableColumns.map((column) => `<td>${renderCell(record, column)}</td>`).join("")}
        </tr>
      `;
    })
    .join("");

  body.querySelectorAll("[data-select-key]").forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleSelection(checkbox.dataset.selectKey);
    });
  });

  body.querySelectorAll("tr[data-record-key]").forEach((row) => {
    row.addEventListener("click", () => {
      state.activeKey = row.dataset.recordKey;
      renderTableBody();
      renderDetail();
    });
  });
}

function renderDetail() {
  const record =
    state.filteredRecords.find((item) => item.record_key === state.activeKey) ??
    state.records.find((item) => item.record_key === state.activeKey);

  if (!record) {
    document.getElementById("detail-title").textContent = "Selecciona una fila";
    document.getElementById("detail-subtitle").textContent = "Haz clic en una fila de la tabla para revisar su decision y compatibilidades.";
    document.getElementById("detail-callout").textContent = "Sin registro activo.";
    document.getElementById("detail-decision").innerHTML = "";
    document.getElementById("detail-compatibility").innerHTML = "No hay compatibilidades para mostrar.";
    document.getElementById("detail-compatibility").classList.add("empty-state");
    document.getElementById("detail-original").innerHTML = "";
    return;
  }

  document.getElementById("detail-title").textContent = `${record.order_id ?? "Sin OrderID"} | ${record.vehicle_display}`;
  document.getElementById("detail-subtitle").textContent = `${record.product_display} | ${record.customer_display}`;

  const callout = document.getElementById("detail-callout");
  callout.className = "detail-callout";
  callout.textContent = buildCalloutText(record);
  if (record.requires_fabrication) {
    callout.classList.add("is-danger");
  } else if (record.needs_manual_review || record.candidate_source === "free_stock") {
    callout.classList.add("is-warning");
  } else {
    callout.classList.add("is-success");
  }

  document.getElementById("detail-decision").innerHTML = renderDetailList([
    ["availability_status", record.availability_status],
    ["recommendation", record.recommendation],
    ["decision_reason", record.decision_reason],
    ["candidate_match_orderid", record.candidate_match_orderid ?? "-"],
    ["candidate_source", record.candidate_source_label ?? record.candidate_source ?? "-"],
    ["validacion", record.primary_match_validation || "-"],
    ["DaysStored", formatInteger(record.days_stored)],
    ["SetStatus", record.set_status_label ?? record.set_status ?? "-"],
  ]);

  document.getElementById("detail-original").innerHTML = renderDetailList([
    ["ID", record.original.id ?? "-"],
    ["OrderID", record.original.order_id ?? "-"],
    ["Serial", record.original.serial ?? "-"],
    ["Vehicle", record.original.vehicle ?? "-"],
    ["Product", record.original.product ?? "-"],
    ["Customer", record.original.customer ?? "-"],
    ["Created", record.original.created ?? "-"],
    ["Invoice", record.original.invoice ?? "-"],
    ["InvoiceCost", formatCurrency(record.original.invoice_cost)],
    ["DaysStored", formatInteger(record.original.days_stored)],
  ]);

  renderCompatibility(record);
}

function renderCompatibility(record) {
  const container = document.getElementById("detail-compatibility");
  const compatibility = record.compatibility ?? {};
  const bestCandidate = compatibility.best_candidate;
  const additionalCandidates = compatibility.additional_candidates ?? [];
  const incompleteCandidates = compatibility.incomplete_candidates ?? [];
  const freeStockCandidates = compatibility.free_stock_candidates ?? [];

  if (!compatibility.all_candidates_count) {
    container.classList.add("empty-state");
    container.textContent = "No se detectaron candidatos para este registro.";
    return;
  }

  container.classList.remove("empty-state");
  container.innerHTML = `
    <div class="compatibility-metrics">
      <div>
        <span>Total</span>
        <strong>${formatInteger(compatibility.all_candidates_count)}</strong>
      </div>
      <div>
        <span>Additional</span>
        <strong>${formatInteger(compatibility.additional_count)}</strong>
      </div>
      <div>
        <span>Incomplete</span>
        <strong>${formatInteger(compatibility.incomplete_count)}</strong>
      </div>
      <div>
        <span>Stock libre</span>
        <strong>${formatInteger(compatibility.free_stock_count)}</strong>
      </div>
    </div>

    <div>
      <h5>Mejor candidato</h5>
      ${renderCandidateList(bestCandidate ? [bestCandidate] : [])}
    </div>

    <div>
      <h5>Candidatos Additional</h5>
      ${renderCandidateList(additionalCandidates)}
    </div>

    <div>
      <h5>Candidatos Incomplete</h5>
      ${renderCandidateList(incompleteCandidates)}
    </div>

    <div>
      <h5>Candidatos stock libre</h5>
      ${renderCandidateList(freeStockCandidates)}
    </div>
  `;
}

function renderCandidateList(candidates) {
  if (!candidates.length) {
    return '<div class="empty-state">Sin candidatos en este grupo.</div>';
  }

  return `
    <ul class="candidate-list">
      ${candidates
        .map(
          (candidate) => `
            <li>
              <h5>${escapeHtml(candidate.order_id ?? "-")} | ${escapeHtml(candidate.customer_display ?? "-")}</h5>
              <p>${escapeHtml(candidate.vehicle ?? "-")} | ${escapeHtml(candidate.product ?? "-")} | ${formatInteger(candidate.days_stored)} dias</p>
              <p>${escapeHtml(candidate.explanation ?? "")}</p>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderCell(record, column) {
  const value = record[column.key];
  if (column.badge === "status") {
    return `<span class="badge ${buildStatusClass(value)}">${escapeHtml(value ?? "-")}</span>`;
  }
  if (column.badge === "availability") {
    return `<span class="badge ${buildAvailabilityClass(value)}">${escapeHtml(value ?? "-")}</span>`;
  }
  if (column.key === "days_stored") {
    return formatInteger(value);
  }
  return value ? escapeHtml(String(value)) : "-";
}

function applyFiltersAndSorting() {
  const search = state.search.toLowerCase();
  state.filteredRecords = state.records
    .filter((record) => {
      const haystack = [
        record.order_id,
        record.vehicle_display,
        record.product_display,
        record.customer_display,
        record.serial,
        record.recommendation,
        record.decision_reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!search || haystack.includes(search)) &&
        (state.filters.vehicle === "all" || record.vehicle_display === state.filters.vehicle) &&
        (state.filters.product === "all" || record.product_display === state.filters.product) &&
        (state.filters.customer === "all" || record.customer_display === state.filters.customer) &&
        (state.filters.setStatus === "all" || (record.set_status_label ?? record.set_status) === state.filters.setStatus) &&
        (!state.filters.freeStockOnly || record.is_free_stock) &&
        (!state.filters.completableOnly || record.completable) &&
        (!state.filters.fabricationOnly || record.requires_fabrication)
      );
    })
    .sort((left, right) => compareRecords(left, right, state.sort));

  const totalPages = getTotalPages();
  if (state.page > totalPages) {
    state.page = totalPages;
  }
}

function populateFilters() {
  populateSelect("vehicle-filter", extractOptions(state.records, "vehicle_display"), "Todos");
  populateSelect("product-filter", extractOptions(state.records, "product_display"), "Todos");
  populateSelect("customer-filter", extractOptions(state.records, "customer_display"), "Todos");
  populateSelect("status-filter", extractOptions(state.records, "set_status_label"), "Todos");
}

function populateSelect(elementId, values, allLabel) {
  const select = document.getElementById(elementId);
  select.innerHTML = [
    `<option value="all">${escapeHtml(allLabel)}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join("");
}

function extractOptions(records, key) {
  return [...new Set(records.map((record) => record[key]).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "es", { sensitivity: "base" }),
  );
}

function resetFilterControls() {
  document.getElementById("search-input").value = "";
  document.getElementById("vehicle-filter").value = "all";
  document.getElementById("product-filter").value = "all";
  document.getElementById("customer-filter").value = "all";
  document.getElementById("status-filter").value = "all";
  document.getElementById("free-stock-toggle").checked = false;
  document.getElementById("completable-toggle").checked = false;
  document.getElementById("fabrication-toggle").checked = false;
}

function getCurrentPageRows() {
  const start = (state.page - 1) * state.pageSize;
  return state.filteredRecords.slice(start, start + state.pageSize);
}

function getTotalPages() {
  return Math.max(1, Math.ceil(state.filteredRecords.length / state.pageSize));
}

function toggleSort(key) {
  if (state.sort.key === key) {
    state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
  } else {
    state.sort.key = key;
    state.sort.direction = key === "days_stored" ? "desc" : "asc";
  }
  renderAll();
}

function toggleSelection(recordKey) {
  if (state.selectedKeys.has(recordKey)) {
    state.selectedKeys.delete(recordKey);
  } else {
    state.selectedKeys.add(recordKey);
  }
  renderTable();
}

function ensureActiveRecord() {
  if (state.filteredRecords.some((record) => record.record_key === state.activeKey)) {
    return;
  }
  state.activeKey = state.filteredRecords[0]?.record_key ?? state.records[0]?.record_key ?? null;
}

function compareRecords(left, right, sortState) {
  const direction = sortState.direction === "asc" ? 1 : -1;
  const leftValue = left[sortState.key];
  const rightValue = right[sortState.key];

  if (sortState.key === "days_stored") {
    return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * direction;
  }

  return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "es", { sensitivity: "base" }) * direction;
}

function buildCalloutText(record) {
  if (record.requires_fabrication) {
    return "Accion sugerida: fabricar. No se encontro donor compatible por Vehicle + Product.";
  }
  if (record.needs_manual_review) {
    return "Accion sugerida: revisar manualmente. Hay datos bloqueantes o inconsistentes.";
  }
  if (record.candidate_source === "additional") {
    return `Accion sugerida: reservar adicional ${record.candidate_match_orderid ?? "compatible"}.`;
  }
  if (record.candidate_source === "incomplete") {
    return `Accion sugerida: reservar pedido incompleto ${record.candidate_match_orderid ?? "compatible"}.`;
  }
  if (record.candidate_source === "free_stock") {
    return `Accion sugerida: validar y reservar ${record.candidate_match_orderid ?? "stock libre"}.`;
  }
  if (record.completable) {
    return `Accion sugerida: reservar ${record.candidate_match_orderid ?? "el mejor candidato"} para completar el pedido.`;
  }
  if (record.is_free_stock) {
    return "Accion sugerida: mantener el registro como stock libre disponible.";
  }
  return "Accion sugerida: disponible para atencion inmediata.";
}

function renderDetailList(items) {
  return items
    .map(
      ([label, value]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(String(value ?? "-"))}</dd>
        </div>
      `,
    )
    .join("");
}

function buildStatusClass(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "complete" || normalized === "completo") return "status-complete";
  if (normalized === "incomplete" || normalized === "incompleto") return "status-incomplete";
  if (normalized === "additionals" || normalized === "adicionales") return "status-additionals";
  return "";
}

function buildAvailabilityClass(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("fabricacion")) return "availability-fabrication";
  if (normalized.includes("revision")) return "availability-review";
  if (normalized.includes("adicional") || normalized.includes("incompleto") || normalized.includes("completable")) {
    return "availability-combinable";
  }
  if (normalized.includes("stock libre")) return "availability-free";
  if (normalized.includes("completo")) return "availability-ready";
  return "";
}

function formatInteger(value) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(value) || 0)}%`;
}

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderFatalError(error) {
  document.body.innerHTML = `
    <main class="page-band">
      <div class="page-inner" style="padding: 48px 0;">
        <section class="data-panel" style="padding: 24px;">
          <p class="section-eyebrow">Error de carga</p>
          <h1 style="margin-top: 10px;">No se pudieron cargar los artefactos estaticos.</h1>
          <p style="line-height: 1.6;">${escapeHtml(error?.message ?? "Error desconocido")}</p>
          <p style="line-height: 1.6;">Ejecuta <code>python test/scripts/build_pruebas.py</code> para regenerar <code>data/</code> y <code>reports/</code>.</p>
        </section>
      </div>
    </main>
  `;
}
