export function LoadingPanel() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">AGP loading</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">Cargando consola operativa...</p>
      <p className="mt-2 text-sm text-slate-500">Preparando metricas, recomendaciones y trazabilidad demo.</p>
    </div>
  );
}
