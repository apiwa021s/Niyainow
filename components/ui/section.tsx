import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Content column for every non-home route. Padding matches the home page so
 * grids line up across navigations. The old top offset that cleared a fixed
 * header is gone — the topbar is sticky and sits in flow now, so reserving
 * 92px here only pushed the first row off a phone screen.
 */
export function PageShell({ children, className, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <main id="main" className={cn("mx-auto w-full max-w-(--shell-max) px-3 py-3 sm:px-4 lg:px-5", className)} {...props}>
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow = "NIYAITHAI / EDITORIAL"
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
      <div className="flex min-w-0 gap-3">
        <span aria-hidden className="mt-0.5 w-0.5 shrink-0 bg-accent-base" />
        <div className="min-w-0">
          {eyebrow ? <p className="editorial-kicker mb-1">{eyebrow}</p> : null}
          <h1 className="text-h1 font-semibold lg:text-display">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-body text-(--text-secondary)">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  href,
  action,
  icon
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-7 w-0.5 shrink-0 bg-[var(--brand-primary)]" />
          {icon}
          <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
        </div>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {href && action ? (
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center rounded-[6px] px-3 text-sm font-semibold text-[var(--brand-light-on-light)] hover:bg-muted"
        >
          {action} 
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[10px] border border-dashed border-border px-6 py-10 text-center">
      <div aria-hidden className="mb-3 grid h-14 w-14 place-items-center border border-[var(--brand-emphasis)]/35 bg-[var(--brand-primary)]/5 text-[var(--brand-emphasis)]">
        {icon ?? <BookGlyph />}
      </div>
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "โหลดข้อมูลไม่สำเร็จ",
  description = "การเชื่อมต่ออาจมีปัญหาชั่วคราว ลองอีกครั้งได้เลย",
  action
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[10px] border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[6px]", className)} aria-hidden />;
}

function BookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
