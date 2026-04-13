export type SourceSetStatus = "Complete" | "Incomplete" | "Additionals";

export type OperationalStatus =
  | "In Stock"
  | "Reserved"
  | "Grouped"
  | "Completed"
  | "Ready for Dispatch"
  | "Dispatched"
  | "Blocked"
  | "Review Needed";

export type GroupingDecisionStatus = "pending" | "approved" | "rejected";

export interface InventoryItem {
  id: string;
  orderId: string;
  serial: string;
  vehicle: string | null;
  created: string;
  product: string;
  invoice: string;
  invoiceCost: number;
  customer: string | null;
  daysStored: number;
  setStatus: SourceSetStatus;
  operationalStatus: OperationalStatus;
  locationCode: string | null;
  qrToken: string;
  reviewReasons: string[];
}

export interface DataQualityIssue {
  itemId: string;
  severity: "info" | "warning" | "error";
  field: "Customer" | "Vehicle" | "Product" | "OrderID" | "Serial" | "SetStatus";
  message: string;
  issueCode:
    | "missing_customer"
    | "missing_vehicle"
    | "missing_product"
    | "duplicate_order"
    | "duplicate_serial"
    | "invalid_status"
    | "suspicious_combination";
}

export interface GroupingMatchCandidate {
  donorId: string;
  donorOrderId: string;
  donorCustomer: string | null;
  donorVehicle: string | null;
  donorProduct: string;
  donorSetStatus: SourceSetStatus;
  sourceType: "additional" | "incomplete" | "free_stock";
  rank: number;
  daysStoredAtDecision: number;
  explanation: string;
}

export interface GroupingRecommendation {
  id: string;
  receiverId: string;
  receiverOrderId: string;
  receiverCustomer: string;
  receiverVehicle: string;
  receiverProduct: string;
  receiverDaysStored: number;
  decisionStatus: GroupingDecisionStatus;
  primaryCandidate: GroupingMatchCandidate | null;
  candidates: GroupingMatchCandidate[];
  summary: string;
}

export interface InventoryImportBatch {
  id: string;
  fileName: string;
  sourceType: "csv" | "xlsx";
  importedAt: string;
  totalRows: number;
  validRows: number;
  rowsNeedingReview: number;
  status: "uploaded" | "processed" | "failed";
}

export interface StockMovement {
  id: string;
  itemId: string;
  action: "reserve" | "group" | "complete" | "dispatch" | "scan" | "move" | "reject";
  fromStatus: OperationalStatus | null;
  toStatus: OperationalStatus | null;
  fromLocation: string | null;
  toLocation: string | null;
  actorName: string;
  occurredAt: string;
  notes: string;
}

export interface QrScanResult {
  qrToken: string;
  item: InventoryItem;
  suggestedAction: string;
  recommendedStatus: OperationalStatus;
}

export interface ReportSummary {
  totalInventory: number;
  completeSets: number;
  incompleteSets: number;
  additionals: number;
  freeStock: number;
  reviewNeeded: number;
  recommendationsPending: number;
  recommendationsApproved: number;
  oldestDaysStored: number;
}

export interface DemoUser {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "commercial_analyst" | "warehouse_operator" | "executive_readonly";
}
