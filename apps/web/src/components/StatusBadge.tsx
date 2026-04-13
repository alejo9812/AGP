import { operationalStatusMeta, type GroupingDecisionStatus, type OperationalStatus } from "@shared";

import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

function toneClasses(tone: BadgeTone) {
  if (tone === "success") return "bg-emerald-100 text-emerald-800";
  if (tone === "warning") return "bg-amber-100 text-amber-800";
  if (tone === "danger") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", toneClasses(tone))}>
      {label}
    </span>
  );
}

export function DecisionBadge({ status }: { status: GroupingDecisionStatus }) {
  const tone = status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
  return <StatusBadge label={status} tone={tone} />;
}

export function OperationalBadge({ status }: { status: OperationalStatus }) {
  const meta = operationalStatusMeta[status];
  return <StatusBadge label={meta.label} tone={meta.tone} />;
}
