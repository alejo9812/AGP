import { zodResolver } from "@hookform/resolvers/zod";
import { Download } from "lucide-react";
import { demoUsers } from "@shared";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GroupingRecommendation } from "@shared";
import { z } from "zod";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { approveRecommendation, getDecisionTone, getRecommendations, rejectRecommendation } from "@/lib/demo-api";
import { downloadCsv } from "@/lib/export";
import { useUiStore } from "@/store/ui-store";

const decisionSchema = z.object({ reason: z.string().min(8, "Incluye una razon concreta para auditoria."), stageLocation: z.string().min(3, "Ubicacion invalida.") });
type DecisionValues = z.infer<typeof decisionSchema>;

interface RecommendationActionFormProps {
  recommendation: GroupingRecommendation;
  actorName: string;
  onApprove: (values: DecisionValues) => Promise<void>;
  onReject: (values: DecisionValues) => Promise<void>;
}

function RecommendationActionForm({ recommendation, actorName, onApprove, onReject }: RecommendationActionFormProps) {
  const form = useForm<DecisionValues>({ resolver: zodResolver(decisionSchema), defaultValues: { reason: "Validado por comercial despues de revisar cliente, vehicle y producto.", stageLocation: "MX-QA-01" } });

  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={(event) => event.preventDefault()}>
      <p className="text-sm font-semibold text-slate-900">Decision humana</p>
      <p className="text-sm text-slate-500">{recommendation.receiverOrderId} · {actorName}</p>
      <textarea className="min-h-[110px] rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" {...form.register("reason")} />
      {form.formState.errors.reason ? <p className="text-sm text-rose-700">{form.formState.errors.reason.message}</p> : null}
      <input className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" {...form.register("stageLocation")} />
      {form.formState.errors.stageLocation ? <p className="text-sm text-rose-700">{form.formState.errors.stageLocation.message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white" onClick={form.handleSubmit(async (values) => { await onApprove(values); })} type="button">Aprobar</button>
        <button className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={form.handleSubmit(async (values) => { await onReject(values); })} type="button">Rechazar</button>
      </div>
    </form>
  );
}

export function RecommendationsScreen() {
  const queryClient = useQueryClient();
  const activeUserId = useUiStore((state) => state.activeUserId);
  const filters = useUiStore((state) => state.recommendationFilters);
  const updateFilters = useUiStore((state) => state.updateRecommendationFilters);
  const resetFilters = useUiStore((state) => state.resetRecommendationFilters);
  const actorName = demoUsers.find((user) => user.id === activeUserId)?.fullName ?? "Analista";

  const recommendationsQuery = useQuery({ queryKey: ["recommendations"], queryFn: getRecommendations });
  const approveMutation = useMutation({
    mutationFn: async ({ recommendationId, values }: { recommendationId: string; values: DecisionValues }) => approveRecommendation({ recommendationId, actorName, reason: values.reason, stageLocation: values.stageLocation }),
    onSuccess: () => {
      toast.success("Recomendacion aprobada y trazabilidad demo actualizada.");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["movements"] }),
        queryClient.invalidateQueries({ queryKey: ["audit"] }),
      ]);
    },
  });
  const rejectMutation = useMutation({
    mutationFn: async ({ recommendationId, values }: { recommendationId: string; values: DecisionValues }) => rejectRecommendation({ recommendationId, actorName, reason: values.reason, stageLocation: values.stageLocation }),
    onSuccess: () => {
      toast.success("Recomendacion rechazada y auditada.");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["audit"] }),
      ]);
    },
  });

  const recommendations = useMemo(() => (recommendationsQuery.data ?? []).filter((item) => {
    const haystack = `${item.receiverOrderId} ${item.receiverCustomer} ${item.receiverVehicle} ${item.receiverProduct}`.toLowerCase();
    const sourceType = item.primaryCandidate?.sourceType ?? "unknown";
    return (!filters.search || haystack.includes(filters.search.toLowerCase())) &&
      (filters.decisionStatus === "all" || item.decisionStatus === filters.decisionStatus) &&
      (filters.sourceType === "all" || sourceType === filters.sourceType);
  }), [filters, recommendationsQuery.data]);

  if (recommendationsQuery.isLoading) return <LoadingPanel />;

  return (
    <div className="space-y-6">
      <PageHeader title="Grouping recommendations" description="Cola ranked con explicacion, candidato principal y aprobacion o rechazo humano obligatorio." actions={<button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => downloadCsv("grouping-recommendations.csv", recommendations.map((item) => ({ id: item.id, receiverOrderId: item.receiverOrderId, receiverCustomer: item.receiverCustomer, decisionStatus: item.decisionStatus, sourceType: item.primaryCandidate?.sourceType ?? "", summary: item.summary })))} type="button"><Download className="h-4 w-4" />Export queue</button>} />
      <Surface description="Filtros persistentes para revisar la cola sin perder contexto.">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Buscar por receiver" value={filters.search} />
          <select className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => updateFilters({ decisionStatus: event.target.value })} value={filters.decisionStatus}><option value="all">Todas las decisiones</option><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option></select>
          <select className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => updateFilters({ sourceType: event.target.value })} value={filters.sourceType}><option value="all">Todas las fuentes</option><option value="additional">additional</option><option value="incomplete">incomplete</option><option value="free_stock">free_stock</option></select>
          <button className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => resetFilters()} type="button">Limpiar filtros</button>
        </div>
      </Surface>
      {!recommendations.length ? <EmptyState description="No hay recomendaciones que coincidan con los filtros actuales." title="La cola esta vacia para este filtro" /> : <div className="grid gap-5">{recommendations.map((recommendation) => <Surface key={recommendation.id} description={recommendation.summary} title={recommendation.receiverOrderId}><div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><div className="space-y-4"><div className="flex flex-wrap items-center gap-3"><Badge tone={getDecisionTone(recommendation.decisionStatus)}>{recommendation.decisionStatus}</Badge><Badge>{recommendation.receiverProduct}</Badge><span className="text-sm text-slate-500">{recommendation.receiverDaysStored} dias</span></div><div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600"><p className="font-semibold text-slate-900">{recommendation.receiverCustomer}</p><p>{recommendation.receiverVehicle}</p>{recommendation.primaryCandidate ? <><p className="mt-4 font-semibold text-slate-900">Candidato principal: {recommendation.primaryCandidate.donorOrderId}</p><p className="mt-1">{recommendation.primaryCandidate.explanation}</p></> : null}</div>{recommendation.decisionStatus === "pending" ? <RecommendationActionForm actorName={actorName} onApprove={async (values) => { await approveMutation.mutateAsync({ recommendationId: recommendation.id, values }); }} onReject={async (values) => { await rejectMutation.mutateAsync({ recommendationId: recommendation.id, values }); }} recommendation={recommendation} /> : null}</div><div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rank</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Donor</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fuente</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Explicacion</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{recommendation.candidates.map((candidate) => <tr key={`${recommendation.id}-${candidate.rank}`}><td className="px-4 py-3 text-sm text-slate-700">{candidate.rank}</td><td className="px-4 py-3 text-sm text-slate-700"><p className="font-semibold text-slate-900">{candidate.donorOrderId}</p><p className="text-slate-500">{candidate.donorCustomer ?? "Stock libre"}</p></td><td className="px-4 py-3 text-sm text-slate-700"><Badge>{candidate.sourceType}</Badge></td><td className="px-4 py-3 text-sm leading-6 text-slate-600">{candidate.explanation}</td></tr>)}</tbody></table></div></div></Surface>)}</div>}
    </div>
  );
}
