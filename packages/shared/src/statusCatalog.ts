import type { OperationalStatus } from "./contracts";

export const operationalStatuses: OperationalStatus[] = [
  "In Stock",
  "Reserved",
  "Grouped",
  "Completed",
  "Ready for Dispatch",
  "Dispatched",
  "Blocked",
  "Review Needed",
];

export const sourceStatuses = ["Complete", "Incomplete", "Additionals"] as const;

export const operationalStatusMeta: Record<
  OperationalStatus,
  { label: string; tone: "neutral" | "success" | "warning" | "danger"; description: string }
> = {
  "In Stock": {
    label: "In Stock",
    tone: "neutral",
    description: "Disponible para analisis, reserva o despacho.",
  },
  Reserved: {
    label: "Reserved",
    tone: "warning",
    description: "Comprometido para una recomendacion o movimiento pendiente.",
  },
  Grouped: {
    label: "Grouped",
    tone: "success",
    description: "Consumido como donante dentro de un agrupamiento aprobado.",
  },
  Completed: {
    label: "Completed",
    tone: "success",
    description: "Set completado y listo para continuar flujo operativo.",
  },
  "Ready for Dispatch": {
    label: "Ready for Dispatch",
    tone: "success",
    description: "Validado y preparado para salida.",
  },
  Dispatched: {
    label: "Dispatched",
    tone: "neutral",
    description: "Despachado fisicamente y cerrado operativamente.",
  },
  Blocked: {
    label: "Blocked",
    tone: "danger",
    description: "No puede moverse hasta resolver una incidencia.",
  },
  "Review Needed": {
    label: "Review Needed",
    tone: "warning",
    description: "Requiere validacion humana antes de seguir el flujo.",
  },
};

export const roleLabels = {
  admin: "Administrador",
  commercial_analyst: "Analista comercial",
  warehouse_operator: "Operador de bodega",
  executive_readonly: "Ejecutivo de solo lectura",
} as const;
