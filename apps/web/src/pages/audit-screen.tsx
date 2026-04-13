import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getAuditEntries } from "@/lib/demo-api";
import { formatDate } from "@/lib/utils";

export function AuditScreen() {
  const auditQuery = useQuery({ queryKey: ["audit"], queryFn: getAuditEntries });
  if (auditQuery.isLoading) return <LoadingPanel />;
  const entries = auditQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit" description="Timeline auditable de imports, decisiones de grouping y movimientos de bodega." />
      <Surface description="El timeline se construye desde batches, decisiones y movimientos demo." title="Timeline">
        <div className="space-y-4">{entries.map((entry) => <article key={entry.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{entry.title}</p><p className="mt-1 text-sm text-slate-500">{entry.actorName} · {formatDate(entry.occurredAt)}</p></div><Badge>{entry.category}</Badge></div><p className="mt-3 text-sm leading-6 text-slate-600">{entry.description}</p></article>)}</div>
      </Surface>
    </div>
  );
}
