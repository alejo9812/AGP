interface MetricCardProps {
  label: string;
  value: number | string;
  hint: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p>
    </article>
  );
}
