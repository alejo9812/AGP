export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatNumber(value: number | string) {
  return new Intl.NumberFormat("es-MX").format(Number(value));
}

export function toneFromSeverity(severity: "info" | "warning" | "error") {
  if (severity === "error") {
    return "danger" as const;
  }

  if (severity === "warning") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
