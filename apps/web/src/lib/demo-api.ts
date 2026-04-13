import {
  demoBatches,
  demoInventory,
  demoIssues,
  demoMovements,
  demoRecommendations,
  demoSummary,
  demoUsers,
} from "@shared";
import type {
  DemoUser,
  GroupingDecisionStatus,
  GroupingRecommendation,
  InventoryImportBatch,
  InventoryItem,
  QrScanResult,
  ReportSummary,
  StockMovement,
} from "@shared";

export interface AuditEntry {
  id: string;
  category: "import" | "grouping" | "warehouse" | "quality";
  title: string;
  description: string;
  actorName: string;
  occurredAt: string;
}

export interface RecommendationDecisionInput {
  recommendationId: string;
  actorName: string;
  reason: string;
  stageLocation?: string;
}

export interface WarehouseActionOption {
  action: "reserve" | "move" | "complete" | "dispatch";
  label: string;
  nextStatus: InventoryItem["operationalStatus"];
}

interface DecisionHistoryEntry {
  actorName: string;
  note: string;
  occurredAt: string;
}

interface DemoState {
  batches: InventoryImportBatch[];
  inventory: InventoryItem[];
  recommendations: GroupingRecommendation[];
  issues: typeof demoIssues;
  movements: StockMovement[];
  users: DemoUser[];
  decisionHistory: Record<string, DecisionHistoryEntry>;
}

const seedDecisionHistory: Record<string, DecisionHistoryEntry> = {
  "grp-003": {
    actorName: "Luis Herrera",
    note: "Aprobado despues de validar cliente, vehiculo y disponibilidad del adicional.",
    occurredAt: "2026-04-12T13:20:00Z",
  },
  "grp-004": {
    actorName: "Daniela Vargas",
    note: "Rechazado por incompatibilidad comercial del producto.",
    occurredAt: "2026-04-12T13:40:00Z",
  },
};

function snapshotState(): DemoState {
  return {
    batches: structuredClone(demoBatches),
    inventory: structuredClone(demoInventory),
    recommendations: structuredClone(demoRecommendations),
    issues: structuredClone(demoIssues),
    movements: structuredClone(demoMovements),
    users: structuredClone(demoUsers),
    decisionHistory: structuredClone(seedDecisionHistory),
  };
}

const db = snapshotState();

async function withLatency<T>(value: T, ms = 120): Promise<T> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

  return structuredClone(value);
}

function deriveSummary(): ReportSummary {
  const pending = db.recommendations.filter((item) => item.decisionStatus === "pending").length;
  const approved = db.recommendations.filter((item) => item.decisionStatus === "approved").length;
  const reviewNeeded = db.inventory.filter(
    (item) => item.operationalStatus === "Review Needed" || item.operationalStatus === "Blocked",
  ).length;

  return {
    ...demoSummary,
    recommendationsPending: pending,
    recommendationsApproved: approved,
    reviewNeeded,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function getItemById(itemId: string) {
  return db.inventory.find((item) => item.id === itemId);
}

function buildMovement(
  input: Omit<StockMovement, "id" | "occurredAt"> & { occurredAt?: string },
): StockMovement {
  return {
    ...input,
    id: `mov-${crypto.randomUUID()}`,
    occurredAt: input.occurredAt ?? nowIso(),
  };
}

export async function getSummary() {
  return withLatency(deriveSummary());
}

export async function getImports() {
  return withLatency(db.batches);
}

export async function getInventory() {
  return withLatency(db.inventory);
}

export async function getQualityIssues() {
  return withLatency(db.issues);
}

export async function getRecommendations() {
  return withLatency(db.recommendations);
}

export async function getFreeStock() {
  return withLatency(
    db.inventory.filter(
      (item) =>
        item.customer == null &&
        item.operationalStatus !== "Grouped" &&
        item.operationalStatus !== "Dispatched",
    ),
  );
}

export async function getMovements() {
  return withLatency(db.movements);
}

export async function getUsers() {
  return withLatency(db.users);
}

export async function getAuditEntries() {
  const importEntries: AuditEntry[] = db.batches.map((batch) => ({
    id: `audit-${batch.id}`,
    category: "import",
    title: `Batch ${batch.fileName}`,
    description: `${batch.totalRows} filas procesadas, ${batch.rowsNeedingReview} en revision.`,
    actorName: "Sistema de importacion",
    occurredAt: batch.importedAt,
  }));

  const groupingEntries: AuditEntry[] = db.recommendations
    .filter((item) => item.decisionStatus !== "pending")
    .map((recommendation) => {
      const decision = db.decisionHistory[recommendation.id];
      const label =
        recommendation.decisionStatus === "approved" ? "Agrupamiento aprobado" : "Agrupamiento rechazado";

      return {
        id: `audit-${recommendation.id}`,
        category: "grouping",
        title: `${label} ${recommendation.receiverOrderId}`,
        description: decision?.note ?? recommendation.summary,
        actorName: decision?.actorName ?? "Analista",
        occurredAt: decision?.occurredAt ?? nowIso(),
      };
    });

  const warehouseEntries: AuditEntry[] = db.movements.map((movement) => ({
    id: `audit-${movement.id}`,
    category: "warehouse",
    title: `Movimiento ${movement.action}`,
    description: movement.notes,
    actorName: movement.actorName,
    occurredAt: movement.occurredAt,
  }));

  return withLatency(
    [...groupingEntries, ...warehouseEntries, ...importEntries].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    ),
  );
}

export function getWarehouseActionOptions(item: InventoryItem): WarehouseActionOption[] {
  if (item.operationalStatus === "Blocked" || item.operationalStatus === "Review Needed") {
    return [];
  }

  if (item.operationalStatus === "Ready for Dispatch") {
    return [{ action: "dispatch", label: "Despachar", nextStatus: "Dispatched" }];
  }

  if (item.operationalStatus === "Reserved") {
    return [
      { action: "complete", label: "Completar set", nextStatus: "Completed" },
      { action: "move", label: "Mover en staging", nextStatus: "Reserved" },
    ];
  }

  if (item.operationalStatus === "Completed") {
    return [{ action: "move", label: "Mover a dock", nextStatus: "Ready for Dispatch" }];
  }

  return [
    { action: "reserve", label: "Reservar", nextStatus: "Reserved" },
    { action: "move", label: "Mover", nextStatus: item.operationalStatus },
  ];
}

export async function scanInventoryItem(searchValue: string): Promise<QrScanResult | null> {
  const normalized = searchValue.trim().toLowerCase();
  const item = db.inventory.find(
    (candidate) =>
      candidate.qrToken.toLowerCase() === normalized ||
      candidate.id.toLowerCase() === normalized ||
      candidate.orderId.toLowerCase() === normalized,
  );

  if (!item) {
    return withLatency(null);
  }

  const [firstAction] = getWarehouseActionOptions(item);

  return withLatency({
    qrToken: item.qrToken,
    item,
    suggestedAction: firstAction?.label ?? "Solicitar revision",
    recommendedStatus: firstAction?.nextStatus ?? item.operationalStatus,
  });
}

export async function approveRecommendation(input: RecommendationDecisionInput) {
  const recommendation = db.recommendations.find((item) => item.id === input.recommendationId);

  if (!recommendation) {
    throw new Error("No se encontro la recomendacion.");
  }

  recommendation.decisionStatus = "approved";
  db.decisionHistory[recommendation.id] = {
    actorName: input.actorName,
    note: input.reason,
    occurredAt: nowIso(),
  };

  const receiver = getItemById(recommendation.receiverId);
  const donor = recommendation.primaryCandidate ? getItemById(recommendation.primaryCandidate.donorId) : undefined;

  if (receiver) {
    db.movements.unshift(
      buildMovement({
        itemId: receiver.id,
        action: "complete",
        fromStatus: receiver.operationalStatus,
        toStatus: "Completed",
        fromLocation: receiver.locationCode,
        toLocation: input.stageLocation ?? "MX-QA-01",
        actorName: input.actorName,
        notes: `Aprobado ${recommendation.id}. ${input.reason}`,
      }),
    );
    receiver.operationalStatus = "Completed";
    receiver.locationCode = input.stageLocation ?? "MX-QA-01";
  }

  if (donor) {
    db.movements.unshift(
      buildMovement({
        itemId: donor.id,
        action: "group",
        fromStatus: donor.operationalStatus,
        toStatus: "Grouped",
        fromLocation: donor.locationCode,
        toLocation: input.stageLocation ?? "MX-QA-01",
        actorName: input.actorName,
        notes: `Donante asignado a ${recommendation.receiverOrderId}. ${input.reason}`,
      }),
    );
    donor.operationalStatus = "Grouped";
    donor.locationCode = input.stageLocation ?? "MX-QA-01";
  }

  return withLatency(recommendation);
}

export async function rejectRecommendation(input: RecommendationDecisionInput) {
  const recommendation = db.recommendations.find((item) => item.id === input.recommendationId);

  if (!recommendation) {
    throw new Error("No se encontro la recomendacion.");
  }

  recommendation.decisionStatus = "rejected";
  db.decisionHistory[recommendation.id] = {
    actorName: input.actorName,
    note: input.reason,
    occurredAt: nowIso(),
  };

  return withLatency(recommendation);
}

export async function performWarehouseAction(input: {
  itemId: string;
  action: WarehouseActionOption["action"];
  actorName: string;
}) {
  const item = getItemById(input.itemId);

  if (!item) {
    throw new Error("No se encontro el item escaneado.");
  }

  const option = getWarehouseActionOptions(item).find((candidate) => candidate.action === input.action);

  if (!option) {
    throw new Error("La accion no es valida para el estado actual.");
  }

  const previousStatus = item.operationalStatus;
  const previousLocation = item.locationCode;

  if (input.action === "move" && previousStatus === "Completed") {
    item.operationalStatus = "Ready for Dispatch";
    item.locationCode = "MX-DOCK-02";
  } else {
    item.operationalStatus = option.nextStatus;
    item.locationCode =
      input.action === "reserve"
        ? "MX-STAGE-01"
        : input.action === "dispatch"
          ? "Outbound"
          : input.action === "move"
            ? "MX-STAGE-02"
            : "MX-QA-01";
  }

  db.movements.unshift(
    buildMovement({
      itemId: item.id,
      action: input.action,
      fromStatus: previousStatus,
      toStatus: item.operationalStatus,
      fromLocation: previousLocation,
      toLocation: item.locationCode,
      actorName: input.actorName,
      notes: `Accion ${input.action} ejecutada desde el flujo QR.`,
    }),
  );

  return withLatency(item);
}

export function getDecisionTone(status: GroupingDecisionStatus) {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "rejected") {
    return "danger" as const;
  }

  return "warning" as const;
}
