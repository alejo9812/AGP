import {
  demoBatches,
  demoInventory,
  demoRecommendations,
  demoUsers,
  operationalStatuses,
  type DemoUser,
  type GroupingRecommendation,
  type InventoryImportBatch,
  type InventoryItem,
  type OperationalStatus,
  type QrScanResult,
  type ReportSummary,
  type StockMovement,
} from "@shared";

import {
  approveRecommendation as approveDemoRecommendation,
  getAuditEntries as getDemoAuditEntries,
  getImports as getDemoImports,
  getMovements as getDemoMovements,
  getQualityIssues as getDemoQualityIssues,
  getRecommendations as getDemoRecommendations,
  getSummary as getDemoSummary,
  getUsers as getDemoUsers,
  performWarehouseAction as performDemoWarehouseAction,
  rejectRecommendation as rejectDemoRecommendation,
  scanInventoryItem,
} from "@/lib/demo-api";

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export interface ImportPreview {
  sourceType: "csv" | "xlsx";
  detectedHeaders: string[];
  missingRequiredHeaders: string[];
  previewRows: Array<Record<string, string | null>>;
  rowCount: number;
}

export interface ImportProcessResult {
  message: string;
  batch?: InventoryImportBatch;
}

export interface QualityIssue {
  itemId: string;
  severity: string;
  field: string;
  message: string;
  issueCode: string;
}

export interface QualityIssueResponse {
  totalIssues: number;
  issues: QualityIssue[];
}

export interface PaginatedResult<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export interface CatalogBundle {
  statuses: Array<{ statusCode: string; displayName: string; description: string }>;
  users: DemoUser[];
}

export interface GroupingAnalysisResult {
  analysisRunId: string;
  generatedRecommendations: number;
  skippedReceivers: number;
  pendingRecommendations: number;
  message: string;
}

export interface AuditEntry {
  id: string;
  category: "import" | "grouping" | "warehouse" | "quality";
  title: string;
  description: string;
  actorName: string;
  occurredAt: string;
}

export interface WarehouseActionChoice {
  action: "reserve" | "move" | "complete" | "dispatch";
  label: string;
  nextStatus: OperationalStatus;
}

function resolveActor(actorEmail: string) {
  return demoUsers.find((user) => user.email === actorEmail) ?? demoUsers[0];
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function defaultImportPreview(): ImportPreview {
  return {
    sourceType: "xlsx",
    detectedHeaders: ["ID", "OrderID", "Serial", "Vehicle", "Created", "Product", "Invoice", "InvoiceCost", "Customer", "DaysStored", "SetStatus"],
    missingRequiredHeaders: [],
    previewRows: demoInventory.slice(0, 5).map((item) => ({
      ID: item.id,
      OrderID: item.orderId,
      Serial: item.serial,
      Vehicle: item.vehicle,
      Created: item.created,
      Product: item.product,
      Invoice: item.invoice,
      InvoiceCost: String(item.invoiceCost),
      Customer: item.customer,
      DaysStored: String(item.daysStored),
      SetStatus: item.setStatus,
    })),
    rowCount: 3838,
  };
}

function normalizeItem(raw: Record<string, unknown>): InventoryItem {
  return {
    id: String(raw.source_id ?? raw.id ?? ""),
    orderId: String(raw.order_id ?? raw.orderId ?? ""),
    serial: String(raw.serial ?? ""),
    vehicle: (raw.vehicle_name ?? raw.vehicle ?? null) as string | null,
    created: String(raw.created_date ?? raw.created ?? ""),
    product: String(raw.product_name ?? raw.product ?? ""),
    invoice: String(raw.invoice ?? ""),
    invoiceCost: toNumber(raw.invoice_cost ?? raw.invoiceCost),
    customer: (raw.customer_name ?? raw.customer ?? null) as string | null,
    daysStored: toNumber(raw.days_stored ?? raw.daysStored),
    setStatus: String(raw.set_status ?? raw.setStatus ?? "Incomplete") as InventoryItem["setStatus"],
    operationalStatus: String(raw.operational_status ?? raw.operationalStatus ?? "In Stock") as OperationalStatus,
    locationCode: ((raw.location as { code?: string } | undefined)?.code ?? raw.locationCode ?? null) as string | null,
    qrToken: String(raw.qr_token ?? raw.qrToken ?? ""),
    reviewReasons: (raw.review_reasons ?? raw.reviewReasons ?? []) as string[],
  };
}

function normalizeRecommendation(raw: Record<string, unknown>): GroupingRecommendation {
  const receiver = (raw.receiver_item ?? {}) as Record<string, unknown>;
  const matches = Array.isArray(raw.matches)
    ? raw.matches.map((entry) => {
        const donor = ((entry as Record<string, unknown>).donor_item ?? {}) as Record<string, unknown>;
        return {
          donorId: String((entry as Record<string, unknown>).donor_item_id ?? donor.source_id ?? donor.id ?? ""),
          donorOrderId: String(donor.order_id ?? ""),
          donorCustomer: (donor.customer_name ?? null) as string | null,
          donorVehicle: (donor.vehicle_name ?? null) as string | null,
          donorProduct: String(donor.product_name ?? ""),
          donorSetStatus: String(donor.set_status ?? "Additionals") as InventoryItem["setStatus"],
          sourceType: String((entry as Record<string, unknown>).source_type ?? "additional") as "additional" | "incomplete" | "free_stock",
          rank: toNumber((entry as Record<string, unknown>).rank),
          daysStoredAtDecision: toNumber((entry as Record<string, unknown>).days_stored_at_decision),
          explanation: String((entry as Record<string, unknown>).explanation ?? ""),
        };
      })
    : [];

  return {
    id: String(raw.recommendation_uuid ?? raw.id ?? ""),
    receiverId: String(receiver.source_id ?? receiver.id ?? ""),
    receiverOrderId: String(receiver.order_id ?? raw.receiverOrderId ?? ""),
    receiverCustomer: String(receiver.customer_name ?? raw.receiverCustomer ?? ""),
    receiverVehicle: String(receiver.vehicle_name ?? raw.receiverVehicle ?? ""),
    receiverProduct: String(receiver.product_name ?? raw.receiverProduct ?? ""),
    receiverDaysStored: toNumber(receiver.days_stored ?? raw.receiverDaysStored),
    decisionStatus: String(raw.decision_status ?? raw.decisionStatus ?? "pending") as GroupingRecommendation["decisionStatus"],
    primaryCandidate: matches[0] ?? null,
    candidates: matches,
    summary: String(raw.summary ?? ""),
  };
}

function normalizeMovement(raw: Record<string, unknown>): StockMovement {
  const item = (raw.inventory_item ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.movement_uuid ?? raw.id ?? ""),
    itemId: String(item.source_id ?? raw.itemId ?? ""),
    action: String(raw.action ?? "move") as StockMovement["action"],
    fromStatus: (raw.from_status ?? raw.fromStatus ?? null) as OperationalStatus | null,
    toStatus: (raw.to_status ?? raw.toStatus ?? null) as OperationalStatus | null,
    fromLocation: (raw.from_location_code ?? raw.fromLocation ?? null) as string | null,
    toLocation: (raw.to_location_code ?? raw.toLocation ?? null) as string | null,
    actorName: String(raw.actor_name ?? raw.actorName ?? "Sistema"),
    occurredAt: String(raw.created_at ?? raw.occurredAt ?? new Date().toISOString()),
    notes: String(raw.notes ?? ""),
  };
}

async function request<T>(path: string, init?: RequestInit, actorEmail?: string): Promise<T> {
  const headers = new Headers(init?.headers);
  if (actorEmail) headers.set("X-Demo-User", actorEmail);
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`API request failed with status ${response.status}.`);
  return (await response.json()) as T;
}

function filterInventory(queryString?: string) {
  const params = new URLSearchParams(queryString ?? "");
  const query = (params.get("query") ?? "").trim().toLowerCase();
  const freeStockOnly = params.get("freeStockOnly") === "true" || params.get("free_stock_only") === "true";
  const reviewOnly = params.get("reviewOnly") === "true" || params.get("review_only") === "true";
  const setStatus = params.get("setStatus") ?? params.get("set_status");
  const operationalStatus = params.get("operationalStatus") ?? params.get("operational_status");

  return demoInventory.filter((item) => {
    if (freeStockOnly && item.customer) return false;
    if (reviewOnly && !item.reviewReasons.length && item.operationalStatus !== "Review Needed" && item.operationalStatus !== "Blocked") return false;
    if (setStatus && setStatus !== "all" && item.setStatus !== setStatus) return false;
    if (operationalStatus && operationalStatus !== "all" && item.operationalStatus !== operationalStatus) return false;
    if (!query) return true;
    return [item.orderId, item.serial, item.customer, item.vehicle, item.product].filter(Boolean).join(" ").toLowerCase().includes(query);
  });
}

export function getWarehouseActionChoices(status: OperationalStatus): WarehouseActionChoice[] {
  if (status === "Blocked" || status === "Review Needed") return [];
  if (status === "Ready for Dispatch") return [{ action: "dispatch", label: "Despachar", nextStatus: "Dispatched" }];
  if (status === "Reserved") {
    return [
      { action: "complete", label: "Completar set", nextStatus: "Completed" },
      { action: "move", label: "Mover en staging", nextStatus: "Reserved" },
    ];
  }
  if (status === "Completed") return [{ action: "move", label: "Mover a dock", nextStatus: "Ready for Dispatch" }];
  return [
    { action: "reserve", label: "Reservar", nextStatus: "Reserved" },
    { action: "move", label: "Mover", nextStatus: status },
  ];
}

export const apiClient = {
  async getSummary(demoMode: boolean): Promise<ReportSummary & { inventoryByStatus?: Record<string, number>; inventoryByProduct?: Record<string, number> }> {
    if (demoMode) return getDemoSummary();
    const payload = await request<Record<string, unknown>>("/api/v1/reports/summary");
    return {
      totalInventory: toNumber(payload.total_inventory),
      completeSets: toNumber(payload.complete_sets),
      incompleteSets: toNumber(payload.incomplete_sets),
      additionals: toNumber(payload.additionals),
      freeStock: toNumber(payload.free_stock),
      reviewNeeded: toNumber(payload.review_needed),
      recommendationsPending: toNumber(payload.recommendations_pending),
      recommendationsApproved: toNumber(payload.recommendations_approved),
      oldestDaysStored: toNumber(payload.oldest_days_stored),
      inventoryByStatus: (payload.inventory_by_status ?? {}) as Record<string, number>,
      inventoryByProduct: (payload.inventory_by_product ?? {}) as Record<string, number>,
    };
  },

  async listImports(demoMode: boolean): Promise<InventoryImportBatch[]> {
    if (demoMode) return getDemoImports();
    const payload = await request<Array<Record<string, unknown>>>("/api/v1/imports");
    return payload.map((item) => ({
      id: String(item.batch_uuid ?? item.id ?? ""),
      fileName: String(item.file_name ?? ""),
      sourceType: String(item.source_type ?? "xlsx") as "csv" | "xlsx",
      importedAt: String(item.created_at ?? new Date().toISOString()),
      totalRows: toNumber(item.total_rows),
      validRows: toNumber(item.valid_rows),
      rowsNeedingReview: toNumber(item.rows_needing_review),
      status: String(item.status ?? "processed") as InventoryImportBatch["status"],
    }));
  },

  async previewImport(demoMode: boolean, file?: File | null): Promise<ImportPreview> {
    if (demoMode || !file) return defaultImportPreview();
    const body = new FormData();
    body.append("file", file);
    const payload = await request<Record<string, unknown>>("/api/v1/imports/preview", { method: "POST", body });
    return {
      sourceType: String(payload.source_type ?? "xlsx") as "csv" | "xlsx",
      detectedHeaders: (payload.detected_headers ?? []) as string[],
      missingRequiredHeaders: (payload.missing_required_headers ?? []) as string[],
      previewRows: (payload.preview_rows ?? []) as Array<Record<string, string | null>>,
      rowCount: toNumber(payload.row_count),
    };
  },

  async processImport(demoMode: boolean, actorEmail: string, file?: File | null): Promise<ImportProcessResult> {
    if (demoMode) return { batch: demoBatches[0], message: `Importacion demo procesada desde ${demoBatches[0].fileName}.` };
    if (!file) throw new Error("Selecciona un archivo antes de procesar la importacion.");
    const body = new FormData();
    body.append("file", file);
    body.append("replace_existing", "true");
    const payload = await request<Record<string, unknown>>("/api/v1/imports", { method: "POST", body }, actorEmail);
    return { message: String(payload.message ?? "Importacion completada.") };
  },

  async getQualityIssues(demoMode: boolean): Promise<QualityIssueResponse> {
    if (demoMode) {
      const issues = await getDemoQualityIssues();
      return { totalIssues: issues.length, issues: issues.map((item) => ({ itemId: item.itemId, severity: item.severity, field: item.field, message: item.message, issueCode: item.issueCode })) };
    }
    const payload = await request<Record<string, unknown>>("/api/v1/inventory/quality");
    return {
      totalIssues: toNumber(payload.total_issues),
      issues: ((payload.issues ?? []) as Array<Record<string, unknown>>).map((item) => ({
        itemId: String(item.item_id ?? ""),
        severity: String(item.severity ?? "warning"),
        field: String(item.field ?? "unknown"),
        message: String(item.message ?? ""),
        issueCode: String(item.issue_code ?? ""),
      })),
    };
  },

  async listInventory(demoMode: boolean, queryString?: string): Promise<PaginatedResult<InventoryItem>> {
    if (demoMode) {
      const items = filterInventory(queryString);
      return { total: items.length, limit: items.length, offset: 0, items };
    }
    const suffix = queryString ? `?${queryString}` : "";
    const payload = await request<Record<string, unknown>>(`/api/v1/inventory${suffix}`);
    const items = ((payload.items ?? []) as Array<Record<string, unknown>>).map(normalizeItem);
    return { total: toNumber(payload.total), limit: toNumber(payload.limit), offset: toNumber(payload.offset), items };
  },

  async listRecommendations(demoMode: boolean): Promise<PaginatedResult<GroupingRecommendation>> {
    if (demoMode) {
      const items = await getDemoRecommendations();
      return { total: items.length, limit: items.length, offset: 0, items };
    }
    const payload = await request<Record<string, unknown>>("/api/v1/grouping/recommendations");
    const items = ((payload.items ?? []) as Array<Record<string, unknown>>).map(normalizeRecommendation);
    return { total: toNumber(payload.total), limit: toNumber(payload.limit), offset: toNumber(payload.offset), items };
  },

  async analyzeGrouping(demoMode: boolean, actorEmail: string): Promise<GroupingAnalysisResult> {
    if (demoMode) {
      return {
        analysisRunId: "demo-analysis-001",
        generatedRecommendations: demoRecommendations.length,
        skippedReceivers: 175,
        pendingRecommendations: demoRecommendations.filter((item) => item.decisionStatus === "pending").length,
        message: "Analisis demo ejecutado sobre dataset sanitizado.",
      };
    }
    const payload = await request<Record<string, unknown>>("/api/v1/grouping/analyze", { method: "POST" }, actorEmail);
    return {
      analysisRunId: String(payload.analysis_run_id ?? ""),
      generatedRecommendations: toNumber(payload.generated_recommendations),
      skippedReceivers: toNumber(payload.skipped_receivers),
      pendingRecommendations: toNumber(payload.pending_recommendations),
      message: String(payload.message ?? ""),
    };
  },

  async approveRecommendation(demoMode: boolean, recommendationId: string, actorEmail: string, reason: string, donorId?: string) {
    if (demoMode) return approveDemoRecommendation({ recommendationId, actorName: resolveActor(actorEmail).fullName, reason });
    const payload = await request<Record<string, unknown>>(
      `/api/v1/grouping/recommendations/${recommendationId}/approve`,
      { method: "POST", body: JSON.stringify({ donor_item_id: donorId ? Number(donorId) : null, notes: reason }) },
      actorEmail,
    );
    return normalizeRecommendation(payload);
  },

  async rejectRecommendation(demoMode: boolean, recommendationId: string, actorEmail: string, reason: string) {
    if (demoMode) return rejectDemoRecommendation({ recommendationId, actorName: resolveActor(actorEmail).fullName, reason });
    const payload = await request<Record<string, unknown>>(
      `/api/v1/grouping/recommendations/${recommendationId}/reject`,
      { method: "POST", body: JSON.stringify({ notes: reason }) },
      actorEmail,
    );
    return normalizeRecommendation(payload);
  },

  async listMovements(demoMode: boolean): Promise<PaginatedResult<StockMovement>> {
    if (demoMode) {
      const items = await getDemoMovements();
      return { total: items.length, limit: items.length, offset: 0, items };
    }
    const payload = await request<Record<string, unknown>>("/api/v1/warehouse/movements");
    const items = ((payload.items ?? []) as Array<Record<string, unknown>>).map(normalizeMovement);
    return { total: toNumber(payload.total), limit: toNumber(payload.limit), offset: toNumber(payload.offset), items };
  },

  async createMovement(
    demoMode: boolean,
    itemId: string,
    action: "reserve" | "move" | "complete" | "dispatch",
    actorEmail: string,
    nextStatus?: OperationalStatus,
  ) {
    if (demoMode) return performDemoWarehouseAction({ itemId, action, actorName: resolveActor(actorEmail).fullName });
    const payload = await request<Record<string, unknown>>(
      "/api/v1/warehouse/movements",
      { method: "POST", body: JSON.stringify({ item_id: Number(itemId), action, to_status: nextStatus ?? null, notes: `Movimiento generado por ${actorEmail}.` }) },
      actorEmail,
    );
    return normalizeMovement(payload);
  },

  async scanQr(demoMode: boolean, value: string, actorEmail: string): Promise<QrScanResult | null> {
    if (demoMode) return scanInventoryItem(value);
    const payload = await request<Record<string, unknown>>("/api/v1/warehouse/scan", { method: "POST", body: JSON.stringify({ qr_token: value }) }, actorEmail);
    return {
      qrToken: String(payload.qr_token ?? ""),
      item: normalizeItem(payload.item as Record<string, unknown>),
      suggestedAction: String(payload.suggested_action ?? ""),
      recommendedStatus: String(payload.recommended_status ?? "In Stock") as OperationalStatus,
    };
  },

  async getCatalogBundle(demoMode: boolean): Promise<CatalogBundle> {
    if (demoMode) {
      const users = await getDemoUsers();
      return { statuses: operationalStatuses.map((status) => ({ statusCode: status, displayName: status, description: status })), users };
    }
    const payload = await request<Record<string, unknown>>("/api/v1/catalogs/bundle");
    return {
      statuses: ((payload.statuses ?? []) as Array<Record<string, unknown>>).map((item) => ({
        statusCode: String(item.status_code ?? ""),
        displayName: String(item.display_name ?? ""),
        description: String(item.description ?? ""),
      })),
      users: ((payload.users ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.user_uuid ?? item.id ?? ""),
        fullName: String(item.full_name ?? ""),
        email: String(item.email ?? ""),
        role: String(item.role ?? "commercial_analyst") as DemoUser["role"],
      })),
    };
  },

  async getAuditEntries(demoMode: boolean): Promise<AuditEntry[]> {
    if (demoMode) return getDemoAuditEntries();
    const [imports, recommendations, movements] = await Promise.all([
      apiClient.listImports(false),
      apiClient.listRecommendations(false),
      apiClient.listMovements(false),
    ]);
    return [
      ...movements.items.map((item) => ({ id: `mov-${item.id}`, category: "warehouse" as const, title: `Movimiento ${item.action}`, description: item.notes, actorName: item.actorName, occurredAt: item.occurredAt })),
      ...recommendations.items.map((item) => ({ id: `grp-${item.id}`, category: "grouping" as const, title: `Decision ${item.decisionStatus} ${item.receiverOrderId}`, description: item.summary, actorName: "Analista comercial", occurredAt: new Date().toISOString() })),
      ...imports.map((item) => ({ id: `imp-${item.id}`, category: "import" as const, title: `Batch ${item.fileName}`, description: `${item.totalRows} filas procesadas, ${item.rowsNeedingReview} con revision.`, actorName: "Sistema de importacion", occurredAt: item.importedAt })),
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  },

  reportExportUrl(dataset: "inventory" | "recommendations", format: "csv" | "xlsx" = "csv") {
    return `${apiBaseUrl}/api/v1/reports/export?dataset=${dataset}&format=${format}`;
  },
};
