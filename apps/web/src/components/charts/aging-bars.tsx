import type { InventoryItem } from "@shared";

import { formatNumber } from "@/lib/utils";

interface AgingBarsProps {
  inventory: InventoryItem[];
}

const buckets = [
  { label: "0-180", min: 0, max: 180 },
  { label: "181-365", min: 181, max: 365 },
  { label: "366-730", min: 366, max: 730 },
  { label: "731-1200", min: 731, max: 1200 },
  { label: "1201+", min: 1201, max: Number.POSITIVE_INFINITY },
];

export function AgingBars({ inventory }: AgingBarsProps) {
  const rows = buckets.map((bucket) => ({
    label: bucket.label,
    count: inventory.filter(
      (item) => item.daysStored >= bucket.min && item.daysStored <= bucket.max,
    ).length,
  }));
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{row.label} dias</span>
            <span>{formatNumber(row.count)}</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-emerald-500"
              style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
