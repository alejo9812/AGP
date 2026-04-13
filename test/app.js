const state = {
  dataset: null,
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

const chartPalette = ["#1f6b63", "#2c8a7d", "#6bb7ad", "#b8d8d2", "#d9ebe8", "#8b3a2a", "#a65b16"];

const tableColumns = [
  { key: "order_id", label: "Pedido", sortable: true },
  { key: "vehicle_display", label: "Vehiculo", sortable: true },
  { key: "product_display", label: "Producto", sortable: true },
  { key: "customer_display", label: "Cliente", sortable: true },
  { key: "days_stored", label: "Dias en bodega", sortable: true },
  { key: "set_status_label", label: "Estado del set", sortable: true, badge: "status" },
  { key: "decision_label", label: "Decision", sortable: true, badge: "availability" },
  { key: "candidate_match_type_label", label: "Tipo de match", sortable: true, badge: "match" },
];

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadDataset();
});

async function loadDataset() {
  try {
    const dataset = await loadPayload("./data/agp_dataset.json", "dataset");
    applyDataset(dataset);
  } catch (error) {
    renderFatalError(error);
  }
}

function applyDataset(dataset) {
  const summary = dataset?.summary;
  const records = Array.isArray(dataset?.records) ? dataset.records : [];

  if (!summary) {
    throw new Error("El dataset estatico no incluye el bloque summary.");
  }

  state.dataset = dataset;
  state.summary = summary;
  state.records = records;
  state.filteredRecords = [...state.records];
  state.activeKey = dataset?.default_active_record_key ?? state.records[0]?.record_key ?? null;

  populateFilters();
  renderAll();
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
  renderCharts();
  renderTable();
  renderDetail();
  renderPdfSummary();
}

function renderHeader() {
  if (!state.summary) {
    return;
  }

  const summary = state.summary;
  const executiveHighlights = Array.isArray(summary.executive_highlights) ? summary.executive_highlights : [];
  setText("executive-headline", summary.executive_headline || "Sin conclusion ejecutiva disponible.");
  setText(
    "executive-headline-note",
    `Inventario total ${formatInteger(summary.kpis?.total_inventory)} | completables ${formatInteger(summary.kpis?.completables)} | fabricacion ${formatInteger(summary.kpis?.requieren_fabricacion)}`,
  );
  document.getElementById("meta-source-file").textContent = state.summary.source_file_name ?? "-";
  document.getElementById("meta-generated-at").textContent = state.summary.generated_at_display ?? "-";
  document.getElementById("download-dataset").setAttribute(
    "href",
    state.summary.download_paths?.dataset_json ?? "./data/agp_dataset.json",
  );
  document.getElementById("download-pdf").setAttribute(
    "href",
    state.summary.download_paths?.pdf_report ?? "./reports/informe_agp.pdf",
  );

  document.getElementById("header-impact").innerHTML = [
    {
      label: "Completables",
      value: formatInteger(summary.kpis?.completables),
      note: `${formatPercent(summary.inventory_reduction_opportunity_percentage)} sobre incompletos`,
    },
    {
      label: "Stock libre",
      value: formatInteger(summary.kpis?.stock_libre),
      note: `${formatPercent(summary.free_stock_percentage)} del inventario`,
    },
    {
      label: "Requieren fabricacion",
      value: formatInteger(summary.kpis?.requieren_fabricacion),
      note: `${formatPercent(summary.manufacturing_dependency_percentage)} de dependencia`,
    },
  ]
    .map(
      (card) => `
        <article class="impact-card">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <p>${escapeHtml(card.note)}</p>
        </article>
      `,
    )
    .join("");

  if (!executiveHighlights.length) {
    document.getElementById("header-impact").innerHTML = "";
  }
}

function renderSummary() {
  const summary = state.summary ?? {};
  const kpis = summary.kpis ?? {};
  const executiveCards = [
    { label: "Inventario total", value: kpis.total_inventory, unit: "registros", note: "Base evaluada por el motor." },
    { label: "Pedidos incompletos", value: kpis.incomplete, unit: "registros", note: "Universo que requiere decision." },
    { label: "Pedidos completables", value: kpis.completables, unit: "registros", note: "Oportunidad inmediata con inventario." },
    { label: "Requieren fabricacion", value: kpis.requieren_fabricacion, unit: "registros", note: "No se encontro match compatible." },
    { label: "Stock libre", value: kpis.stock_libre, unit: "registros", note: "Reservable con validacion comercial." },
    { label: "Antiguedad maxima", value: kpis.antiguedad_maxima, unit: "dias", note: "Mayor permanencia detectada." },
  ];

  setText(
    "summary-note",
    [
      `${formatInteger(kpis.total_inventory)} registros analizados`,
      `${formatPercent(summary.completable_over_total_percentage)} del total es recuperable sin fabricar`,
      `${formatPercent(summary.excluded_percentage)} excluido por revision manual`,
    ].join(" | "),
  );
  setText("spotlight-text", summary.executive_headline || "No hay lectura ejecutiva disponible para este lote.");

  document.getElementById("highlight-grid").innerHTML = (summary.executive_highlights ?? [])
    .map(
      (item) => `
        <article class="highlight-card">
          <span>${escapeHtml(item.title ?? "Hallazgo")}</span>
          <p>${escapeHtml(item.text ?? "-")}</p>
        </article>
      `,
    )
    .join("");

  document.getElementById("narrative-list").innerHTML = [
    `La pagina, el JSON descargable y el PDF consumen el mismo dataset generado en <code>test/</code>.`,
    `Se analizan ${formatInteger(kpis.total_inventory)} registros y se prioriza inventario con mayor antiguedad en bodega.`,
    `${formatInteger(kpis.revision_manual)} registros quedaron fuera de agrupacion automatica por calidad de datos o reglas de bloqueo.`,
    `${formatInteger(kpis.additionals)} registros Additional siguen visibles en la tabla y entran como donantes antes que otros incompletos.`,
  ]
    .map((item) => `<li>${item}</li>`)
    .join("");

  document.getElementById("kpi-grid").innerHTML = executiveCards.map(renderKpiCard).join("");
  document.getElementById("metric-groups").innerHTML = buildMetricGroups(summary.kpi_groups ?? {});
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
    document.getElementById("table-detail-title").textContent = "Selecciona una fila";
    document.getElementById("table-detail-subtitle").textContent = "Haz clic en una fila de la tabla para revisar su decision y compatibilidades.";
    document.getElementById("table-detail-callout").textContent = "Sin registro activo.";
    document.getElementById("detail-decision").innerHTML = "";
    document.getElementById("detail-compatibility").innerHTML = "No hay compatibilidades para mostrar.";
    document.getElementById("detail-compatibility").classList.add("empty-state");
    document.getElementById("detail-original").innerHTML = "";
    return;
  }

  document.getElementById("detail-title").textContent = `${record.order_id ?? "Sin OrderID"} | ${record.vehicle_display}`;
  document.getElementById("detail-subtitle").textContent = `${record.product_display} | ${record.customer_display}`;
  document.getElementById("table-detail-title").textContent = `${record.order_id ?? "Sin OrderID"} | ${record.vehicle_display}`;
  document.getElementById("table-detail-subtitle").textContent = `${record.product_display} | ${record.customer_display}`;

  const callout = document.getElementById("detail-callout");
  callout.className = "detail-callout";
  callout.textContent = buildCalloutText(record);
  const stripCallout = document.getElementById("table-detail-callout");
  stripCallout.className = "detail-callout selected-strip-callout";
  stripCallout.textContent = buildCalloutText(record);
  if (record.should_manufacture || record.requires_fabrication) {
    callout.classList.add("is-danger");
    stripCallout.classList.add("is-danger");
  } else if (record.requires_manual_review || record.needs_manual_review || record.candidate_source === "free_stock") {
    callout.classList.add("is-warning");
    stripCallout.classList.add("is-warning");
  } else {
    callout.classList.add("is-success");
    stripCallout.classList.add("is-success");
  }

  document.getElementById("detail-decision").innerHTML = renderDetailList([
    ["Decision", record.decision_label || record.availability_status || "-"],
    ["Recomendacion", record.recommendation || "-"],
    ["Motivo", record.decision_reason || "-"],
    ["Pedido candidato", record.candidate_match_orderid ?? "-"],
    ["Tipo de match", record.candidate_match_type_label ?? record.candidate_source_label ?? "-"],
    ["Validacion", record.primary_match_validation || "-"],
    ["Prioridad", formatPriority(record.priority_score)],
    ["Dias en bodega", formatInteger(record.days_stored)],
    ["Estado del set", record.set_status_label ?? record.set_status ?? "-"],
    ["Revision manual", record.requires_manual_review || record.needs_manual_review ? "Si" : "No"],
    ["Requiere fabricacion", record.should_manufacture || record.requires_fabrication ? "Si" : "No"],
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
      ${renderCandidateList(bestCandidate ? [bestCandidate] : [], true)}
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

function renderCandidateList(candidates, isPrimary = false) {
  if (!candidates.length) {
    return '<div class="empty-state">Sin candidatos en este grupo.</div>';
  }

  return `
    <ul class="candidate-list">
      ${candidates
        .map(
          (candidate) => `
            <li ${isPrimary ? 'class="candidate-primary"' : ""}>
              <div class="candidate-head">
                <h5>${escapeHtml(candidate.order_id ?? "-")} | ${escapeHtml(candidate.customer_display ?? "-")}</h5>
                <span class="badge badge-match">${escapeHtml(candidate.candidate_source_label ?? candidate.candidate_source ?? "-")}</span>
              </div>
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
  if (column.badge === "match") {
    return `<span class="badge badge-match">${escapeHtml(value ?? "-")}</span>`;
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
        record.decision_label,
        record.candidate_match_type_label,
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
        (!state.filters.fabricationOnly || record.should_manufacture || record.requires_fabrication)
      );
    })
    .sort((left, right) => compareRecords(left, right, state.sort));

  const totalPages = getTotalPages();
  if (state.page > totalPages) {
    state.page = totalPages;
  }
}

function renderCharts() {
  const charts = state.summary?.charts ?? {};
  renderSegmentChart("chart-composition", charts.composition?.series ?? []);
  renderDonutChart("chart-resolution", charts.resolution?.series ?? []);
  renderBarChart("chart-aging", charts.aging?.series ?? [], {
    labelKey: "label",
    valueKey: "count",
    meta: (item) => `${formatCurrency(item.value)} inmovilizados`,
  });
  renderWaterfallChart("chart-waterfall", charts.waterfall?.series ?? []);
  renderBarChart("chart-pareto", charts.pareto?.series ?? [], {
    labelKey: "label",
    valueKey: "count",
  });
  renderBarChart("chart-critical-products", charts.critical_products?.series ?? [], {
    labelKey: "label",
    valueKey: "count",
    meta: (item) => `${formatCurrency(item.value)} | ${formatInteger(item.records)} registros`,
  });

  setText("note-composition", charts.composition?.note || "");
  setText("note-resolution", charts.resolution?.note || "");
  setText("note-aging", charts.aging?.note || "");
  setText("note-waterfall", charts.waterfall?.note || "");
  setText("note-pareto", charts.pareto?.note || "");
  setText("note-critical-products", charts.critical_products?.note || "");
}

function renderSegmentChart(containerId, series) {
  const container = document.getElementById(containerId);
  const cleanSeries = Array.isArray(series) ? series.filter((item) => Number(item?.value) > 0) : [];

  if (!cleanSeries.length) {
    container.innerHTML = '<div class="empty-state">Sin datos para visualizar.</div>';
    return;
  }

  const total = cleanSeries.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const segments = cleanSeries
    .map((item, index) => {
      const value = Number(item.value) || 0;
      const percentage = total ? (value / total) * 100 : 0;
      return `<span class="segment" style="width:${percentage}%; background:${chartPalette[index % chartPalette.length]};"></span>`;
    })
    .join("");

  const legend = cleanSeries
    .map(
      (item, index) => `
        <li>
          <span class="legend-dot" style="background:${chartPalette[index % chartPalette.length]};"></span>
          <span>${escapeHtml(item.label ?? "-")}</span>
          <strong>${formatInteger(item.value)}</strong>
        </li>
      `,
    )
    .join("");

  container.innerHTML = `
    <div class="segment-bar">${segments}</div>
    <ul class="chart-legend">${legend}</ul>
  `;
}

function renderDonutChart(containerId, series) {
  const container = document.getElementById(containerId);
  const cleanSeries = Array.isArray(series) ? series.filter((item) => Number(item?.count) > 0) : [];

  if (!cleanSeries.length) {
    container.innerHTML = '<div class="empty-state">Sin resoluciones para visualizar.</div>';
    return;
  }

  const total = cleanSeries.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const gradientStops = [];
  let cursor = 0;
  cleanSeries.forEach((item, index) => {
    const value = Number(item.count) || 0;
    const percentage = total ? (value / total) * 100 : 0;
    const nextCursor = cursor + percentage;
    const color = chartPalette[index % chartPalette.length];
    gradientStops.push(`${color} ${cursor}% ${nextCursor}%`);
    cursor = nextCursor;
  });

  const legend = cleanSeries
    .map(
      (item, index) => `
        <li>
          <span class="legend-dot" style="background:${chartPalette[index % chartPalette.length]};"></span>
          <span>${escapeHtml(item.label ?? "-")}</span>
          <strong>${formatInteger(item.count)}</strong>
        </li>
      `,
    )
    .join("");

  container.innerHTML = `
    <div class="donut-layout">
      <div class="donut-chart" style="background:conic-gradient(${gradientStops.join(", ")});">
        <div class="donut-hole">
          <strong>${formatInteger(total)}</strong>
          <span>casos</span>
        </div>
      </div>
      <ul class="chart-legend">${legend}</ul>
    </div>
  `;
}

function renderBarChart(containerId, series, options = {}) {
  const container = document.getElementById(containerId);
  const {
    labelKey = "label",
    valueKey = "count",
    meta = null,
  } = options;
  const cleanSeries = Array.isArray(series) ? series.filter((item) => Number(item?.[valueKey]) > 0) : [];

  if (!cleanSeries.length) {
    container.innerHTML = '<div class="empty-state">Sin datos para visualizar.</div>';
    return;
  }

  const maxValue = Math.max(...cleanSeries.map((item) => Number(item[valueKey]) || 0), 1);
  container.innerHTML = cleanSeries
    .slice(0, 8)
    .map((item, index) => {
      const value = Number(item[valueKey]) || 0;
      const width = (value / maxValue) * 100;
      return `
        <div class="bar-row">
          <div class="bar-label">
            <strong>${escapeHtml(item[labelKey] ?? "-")}</strong>
            ${meta ? `<span>${escapeHtml(meta(item))}</span>` : ""}
          </div>
          <div class="bar-track">
            <span class="bar-fill" style="width:${width}%; background:${chartPalette[index % chartPalette.length]};"></span>
          </div>
          <div class="bar-value">${formatInteger(value)}</div>
        </div>
      `;
    })
    .join("");
}

function renderWaterfallChart(containerId, series) {
  const container = document.getElementById(containerId);
  const cleanSeries = Array.isArray(series) ? series : [];

  if (!cleanSeries.length) {
    container.innerHTML = '<div class="empty-state">Sin datos para visualizar.</div>';
    return;
  }

  container.innerHTML = `
    <div class="waterfall-grid">
      ${cleanSeries
        .map(
          (item, index) => `
            <div class="waterfall-step">
              <span>${index + 1}</span>
              <strong>${formatInteger(item.count)}</strong>
              <p>${escapeHtml(item.label ?? "-")}</p>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderPdfSummary() {
  const summary = state.summary ?? {};
  const list = [
    `Portada ejecutiva con KPIs principales, archivo analizado y lectura de negocio.`,
    `Resumen ejecutivo con ${formatPercent(summary.inventory_reduction_opportunity_percentage)} de potencial de resolucion sobre pedidos incompletos.`,
    `Seccion de calidad de datos con exclusiones, duplicados y causas de revision manual.`,
    `Bloque de salud del inventario con antiguedad, composicion y valor inmovilizado.`,
    `Anexo con casos de revision manual, top combinaciones y recomendaciones detalladas.`,
  ];
  document.getElementById("pdf-summary-list").innerHTML = list.map((item) => `<li>${item}</li>`).join("");
}

function renderKpiCard(card) {
  return `
    <article class="kpi-card">
      <p>${escapeHtml(card.label)}</p>
      <strong>${formatMetricValue(card.value, card.unit)}</strong>
      <p>${escapeHtml(card.note)}</p>
    </article>
  `;
}

function buildMetricGroups(groups) {
  const groupConfig = [
    { key: "operational", title: "KPIs operativos", note: "Seguimiento del motor de agrupamiento." },
    { key: "quality", title: "Calidad de datos", note: "Bloqueos y exclusiones del analisis." },
    { key: "financial", title: "KPIs financieros", note: "Lectura economica aproximada con InvoiceCost." },
  ];

  return groupConfig
    .map((group) => {
      const items = Array.isArray(groups[group.key]) ? groups[group.key] : [];
      if (!items.length) {
        return "";
      }
      return `
        <section class="metric-group data-panel">
          <div class="subsection-heading">
            <h3>${escapeHtml(group.title)}</h3>
            <p>${escapeHtml(group.note)}</p>
          </div>
          <div class="metric-card-grid">
            ${items
              .map(
                (item) => `
                  <article class="metric-card">
                    <span>${escapeHtml(item.label ?? "-")}</span>
                    <strong>${formatMetricValue(item.value, item.unit)}</strong>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");
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

  if (["days_stored", "priority_score"].includes(sortState.key)) {
    return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * direction;
  }

  return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "es", { sensitivity: "base" }) * direction;
}

function buildCalloutText(record) {
  if (record.should_manufacture || record.requires_fabrication) {
    return "Accion sugerida: fabricar. No se encontro un donante compatible con las reglas de negocio.";
  }
  if (record.requires_manual_review || record.needs_manual_review) {
    return "Accion sugerida: revisar manualmente. Hay datos bloqueantes o inconsistentes.";
  }
  if (record.candidate_source === "additional") {
    return `Accion sugerida: reservar primero el Additional ${record.candidate_match_orderid ?? "compatible"}.`;
  }
  if (record.candidate_source === "incomplete") {
    return `Accion sugerida: reservar el pedido incompleto ${record.candidate_match_orderid ?? "compatible"}.`;
  }
  if (record.candidate_source === "free_stock") {
    return `Accion sugerida: validar comercialmente y reservar ${record.candidate_match_orderid ?? "stock libre"}.`;
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

function formatMetricValue(value, unit) {
  if (unit === "%") {
    return formatPercent(value);
  }
  if (unit === "usd") {
    return formatCurrency(value);
  }
  const formatted = Number.isFinite(Number(value)) ? formatInteger(value) : String(value ?? "-");
  return unit && unit !== "registros" ? `${formatted} ${unit}` : formatted;
}

function formatPriority(value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
    return "-";
  }
  return `P${formatInteger(value)}`;
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

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value ?? "";
  }
}

function renderFatalError(error) {
  document.body.innerHTML = `
    <main class="page-band">
      <div class="page-inner" style="padding: 48px 0;">
        <section class="data-panel" style="padding: 24px;">
          <p class="section-eyebrow">Error de carga</p>
          <h1 style="margin-top: 10px;">No se pudieron cargar los artefactos estaticos.</h1>
          <p style="line-height: 1.6;">${escapeHtml(error?.message ?? "Error desconocido")}</p>
          <p style="line-height: 1.6;">Ejecuta <code>python test/scripts/build_pruebas.py</code> para regenerar <code>data/agp_dataset.json</code>, <code>data/agp_dataset.js</code> y <code>reports/</code>.</p>
        </section>
      </div>
    </main>
  `;
}
