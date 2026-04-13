import type { LucideIcon } from "lucide-react";

import { formatNumber } from "@/lib/utils";

const accentClasses = {
  slate: "bg-slate-100 text-slate-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
} as const;

interface StatCardProps {
  title: string;
  value: number | string;
  helper: string;
  icon: LucideIcon;
  accent?: keyof typeof accentClasses;
}

export function StatCard({ title, value, helper, icon: Icon, accent = "slate" }: StatCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
        </div>
        <div className={`rounded-md p-3 ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">{helper}</p>
    </article>
  );
}
