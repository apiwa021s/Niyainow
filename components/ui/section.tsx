import Link from "next/link";
import type { ReactNode } from "react";
import { BrandSectionSignal } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8", className)}>{children}</main>;
}

export function SectionHeader({ title, href, action, icon }: { title: string; href?: string; action?: string; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <div className="mb-1.5">{icon ?? <BrandSectionSignal />}</div>
        <h2 className="text-lg font-bold tracking-normal sm:text-xl">{title}</h2>
      </div>
      {href && action ? (
        <Link className="rounded-md px-2 py-1 text-sm font-semibold text-[var(--brand-accent)] hover:bg-white/8 hover:text-foreground" href={href}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="premium-panel rounded-lg border border-dashed border-border p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-white/10", className)} />;
}
