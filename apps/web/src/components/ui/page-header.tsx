interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-7 text-slate-600 md:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
