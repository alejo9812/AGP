import { cn } from "@/lib/utils";

interface SurfaceProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Surface({ title, description, actions, className, children }: SurfaceProps) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {title || description || actions ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            {title ? <h3 className="text-lg font-semibold text-slate-950">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
