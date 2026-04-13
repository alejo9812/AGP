import type { InventoryItem } from "@shared";
import { operationalStatusMeta } from "@shared";

import { formatNumber } from "@/lib/utils";

interface StatusDistributionProps {
  inventory: InventoryItem[];
}

export function StatusDistribution({ inventory }: StatusDistributionProps) {
  const grouped = Object.entries(
    inventory.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.operationalStatus] = (accumulator[item.operationalStatus] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);
  const total = inventory.length || 1;

  return (
    <div className="space-y-4">
      {grouped.map(([status, count]) => (
        <div key={status}>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{operationalStatusMeta[status as keyof typeof operationalStatusMeta]?.label ?? status}</span>
            <span>{formatNumber(count)}</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-teal-500"
              style={{ width: `${Math.max(8, (count / total) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
