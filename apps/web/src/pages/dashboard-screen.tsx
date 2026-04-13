import { useMemo } from "react";
import { AlertTriangle, Boxes, CheckCircle2, Clock3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { AgingBars } from "@/components/charts/aging-bars";
import { StatusDistribution } from "@/components/charts/status-distribution";
import { Badge } from "@/components/ui/badge";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Surface } from "@/components/ui/surface";
import { getInventory, getQualityIssues, getRecommendations, getSummary } from "@/lib/demo-api";
import { toneFromSeverity } from "@/lib/utils";

export function DashboardScreen() {
  const summaryQuery = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const inventoryQuery = useQuery({ queryKey: ["inventory"], queryFn: getInventory });
  const recommendationsQuery = useQuery({ queryKey: ["recommendations"], queryFn: getRecommendations });
  const qualityQuery = useQuery({ queryKey: ["quality"], queryFn: getQualityIssues });

  const freeStockPreview = useMemo(
    () => (inventoryQuery.data ?? []).filter((item) => item.customer == null).slice(0, 4),
    [inventoryQuery.data],
  );
  const pendingRecommendations = useMemo(
    () => (recommendationsQuery.data ?? []).filter((item) => item.decisionStatus === "pending").slice(0, 3),
    [recommendationsQuery.data],
  );

  if (summaryQuery.isLoading || inventoryQuery.isLoading || recommendationsQuery.isLoading || qualityQuery.isLoading) {
    return <LoadingPanel />;
  }

  const summary = summaryQuery.data!;
  const inventory = inventoryQuery.data ?? [];
  const qualityIssues = qualityQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="KPIs del MVP, alertas de calidad, recomendaciones pendientes y lectura operativa para comercial y bodega."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard accent="emerald" helper="Subset demo inspirado en el corte de 3,838 filas del Excel" icon={Boxes} title="Inventario total" value={summary.totalInventory} />
        <StatCard accent="amber" helper="Receptores listos para revision comercial" icon={Clock3} title="Pendientes de recomendacion" value={summary.recommendationsPending} />
        <StatCard helper="Pool reutilizable cuando Customer viene vacio" icon={CheckCircle2} title="Stock libre" value={summary.freeStock} />
        <StatCard accent="rose" helper="Items que requieren dato faltante o validacion" icon={AlertTriangle} title="Review needed" value={summary.reviewNeeded} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface description="Alertas priorizadas del lote demo, listas para ir a la cola de calidad." title="Alertas de calidad">
          <div className="space-y-3">
            {qualityIssues.slice(0, 4).map((issue) => (
              <div key={`${issue.itemId}-${issue.issueCode}`} className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{issue.itemId}</p>
                    <p className="text-sm text-slate-500">{issue.field}</p>
                  </div>
                  <Badge tone={toneFromSeverity(issue.severity)}>{issue.severity}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{issue.message}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface description="Snapshot rapido del stock libre compatible visible desde dashboard." title="Free stock reutilizable">
          <div className="space-y-3">
            {freeStockPreview.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.orderId}</p>
                  <Badge>{item.setStatus}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.vehicle ?? "Vehicle pendiente"} · {item.product}</p>
                <p className="mt-1 text-sm text-slate-500">{item.daysStored} dias almacenado</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface description="Buckets simples para validar politica oldest-first." title="Aging del inventario">
          <AgingBars inventory={inventory} />
        </Surface>
        <Surface description="Distribucion operativa del subset demo." title="Estado operativo">
          <StatusDistribution inventory={inventory} />
        </Surface>
      </div>

      <Surface description="La recomendacion incluye receptor, candidato principal, explicacion y estado de decision." title="Recommendations pendientes">
        <div className="grid gap-4 lg:grid-cols-3">
          {pendingRecommendations.map((recommendation) => (
            <article key={recommendation.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{recommendation.receiverOrderId}</p>
                <Badge tone="warning">{recommendation.decisionStatus}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-600">{recommendation.receiverCustomer} · {recommendation.receiverVehicle}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.summary}</p>
            </article>
          ))}
        </div>
      </Surface>
    </div>
  );
}
