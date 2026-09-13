import { CheckCircle2, CircleAlert, Info, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type NoticeTone = "info" | "success" | "warning" | "danger";

const noticeStyles: Record<NoticeTone, { icon: LucideIcon; className: string; iconClassName: string }> = {
  info: { icon: Info, className: "border-sky-500/25 bg-sky-500/8", iconClassName: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  success: { icon: CheckCircle2, className: "border-emerald-500/25 bg-emerald-500/8", iconClassName: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  warning: { icon: TriangleAlert, className: "border-amber-500/25 bg-amber-500/8", iconClassName: "bg-amber-500/12 text-amber-800 dark:text-amber-200" },
  danger: { icon: CircleAlert, className: "border-destructive/30 bg-destructive/8", iconClassName: "bg-destructive/12 text-destructive" },
};

export function TranslationNotice({ tone = "info", title, description, action, role }: {
  tone?: NoticeTone;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
}) {
  const style = noticeStyles[tone];
  const Icon = style.icon;
  return (
    <div role={role} className={cn("flex flex-wrap items-start gap-3 rounded-[14px] border p-4", style.className)}>
      <span aria-hidden className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", style.iconClassName)}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><div className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</div></div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function TranslationMetric({ label, value, hint, icon: Icon, tone = "neutral" }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: "neutral" | "brand" | "success" | "warning";
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--sh-1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-bold tabular-nums">{value}</p></div>
        <span aria-hidden className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-[11px]",
          tone === "brand" && "bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]",
          tone === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
          tone === "warning" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
          tone === "neutral" && "bg-muted text-muted-foreground",
        )}><Icon className="h-4 w-4" /></span>
      </div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TranslationEmptyState({ title, description, action, icon: Icon = Sparkles }: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="grid justify-items-center px-5 py-12 text-center">
      <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]"><Icon className="h-6 w-6" /></span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
