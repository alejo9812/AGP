import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp } from "lucide-react";
import { demoRecommendations } from "@shared";

import { AgingBars } from "@/components/charts/aging-bars";
import { StatusDistribution } from "@/components/charts/status-distribution";
import { Badge } from "@/components/ui/badge";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Surface } from "@/components/ui/surface";
import { getInventory, getRecommendations, getSummary } from "@/lib/demo-api";
import { downloadCsv } from "@/lib/export";

export function ReportsScreen() {
  const summaryQuery = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const inventoryQuery = useQuery({ queryKey: ["inventory"], queryFn: getInventory });
  const recommendationsQuery = useQuery({ queryKey: ["recommendations"], queryFn: getRecommendations });
  const executiveNotes = useMemo(() => [
    "El motor prioriza antiguedad y mantiene explicacion por candidato.",
    "Los rechazos no mutan inventario y quedan auditados.",
    "El pool de stock libre se mantiene visible para comercial y bodega.",
  ], []);

  if (summaryQuery.isLoading || inventoryQuery.isLoading || recommendationsQuery.isLoading) return <LoadingPanel />;
  const summary = summaryQuery.data!;
  const inventory = inventoryQuery.data ?? [];
  const recommendations = recommendationsQuery.data ?? demoRecommendations;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Resumen ejecutivo, exportes y lectura compacta del aging, estados y decisiones del prototipo." actions={<button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50" onClick={() => downloadCsv("report-summary.csv", [{ totalInventory: summary.totalInventory, recommendationsPending: summary.recommendationsPending, recommendationsApproved: summary.recommendationsApproved, oldestDaysStored: summary.oldestDaysStored }])} type="button"><Download className="h-4 w-4" />Export summary</button>} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard accent="emerald" helper="Sets completos reportados" icon={TrendingUp} title="Complete" value={summary.completeSets} />
        <StatCard accent="amber" helper="Pendientes de completar" icon={TrendingUp} title="Incomplete" value={summary.incompleteSets} />
        <StatCard helper="Stock libre reportado" icon={TrendingUp} title="Free stock" value={summary.freeStock} />
        <StatCard helper="Decisiones aprobadas" icon={TrendingUp} title="Approved" value={summary.recommendationsApproved} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Surface description="Distribucion actual del subset demo por estado operativo." title="Estado operativo"><StatusDistribution inventory={inventory} /></Surface>
        <Surface description="Buckets simples para rotacion FEFO." title="Aging buckets"><AgingBars inventory={inventory} /></Surface>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Surface description="Puntos para la narrativa ejecutiva del prototipo." title="Executive brief"><ul className="space-y-3 text-sm leading-6 text-slate-600">{executiveNotes.map((note) => <li key={note} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">{note}</li>)}</ul></Surface>
        <Surface description="Estado actual de la cola de recomendaciones." title="Snapshot de recomendaciones"><div className="space-y-3">{recommendations.map((recommendation) => <div key={recommendation.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{recommendation.receiverOrderId}</p><Badge tone={recommendation.decisionStatus === "approved" ? "success" : recommendation.decisionStatus === "rejected" ? "danger" : "warning"}>{recommendation.decisionStatus}</Badge></div><p className="mt-2 text-sm text-slate-600">{recommendation.summary}</p></div>)}</div></Surface>
      </div>
    </div>
  );
}
