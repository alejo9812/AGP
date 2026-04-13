import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
