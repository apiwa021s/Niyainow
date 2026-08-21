import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StudioPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        <p className="editorial-kicker">{eyebrow}</p>
        <h1 className="mt-1.5 text-h1 font-semibold">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-7 text-(--text-secondary)">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2 sm:shrink-0">{action}</div> : null}
    </header>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  change,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  /** Percentage versus the previous period. Omit when there is nothing to compare. */
  change?: number;
  hint?: string;
}) {
  const up = (change ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-(--text-secondary)">{label}</span>
        <Icon aria-hidden className="h-4 w-4 shrink-0 text-brand-primary" />
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {unit ? <span className="text-xs text-(--text-tertiary)">{unit}</span> : null}
      </p>
      {change !== undefined ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
            up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          <Arrow aria-hidden className="h-3.5 w-3.5" />
          {up ? "+" : ""}
          {change.toFixed(1)}%
          <span className="font-normal text-(--text-tertiary)">เทียบงวดก่อน</span>
        </p>
      ) : null}
      {hint ? <p className="mt-2 text-xs leading-5 text-(--text-tertiary)">{hint}</p> : null}
    </div>
  );
}

export function StatusPill({ label, dot }: { label: string; dot: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-(--text-secondary)">
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

export function StudioPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-5 text-(--text-tertiary)">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
      <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-accent-subtle text-brand-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="font-semibold">{title}</h3>
      <p className="max-w-sm text-sm leading-7 text-(--text-secondary)">{description}</p>
      {action}
    </div>
  );
}

/** Rows are links on their own; this keeps the hit area and hover consistent. */
export function StudioRowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-5 py-4 transition-colors duration-[var(--dur-fast)] hover:bg-muted/60"
    >
      {children}
    </Link>
  );
}
