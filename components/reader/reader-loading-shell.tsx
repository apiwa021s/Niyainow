"use client";

import { ArrowLeft, List } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { InkLogoLoader } from "@/components/ui/ink-logo-loader";

function ReaderSkeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-[6px] bg-current/10", className)} />;
}

function IconGhost({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center text-current/45">
      {children}
    </span>
  );
}

/**
 * Purely presentational: theme, measure, and face are already on <html> from
 * the pre-paint script, so the skeleton inherits them without reading the
 * store. That also keeps it renderable before hydration, which is the entire
 * reason it exists.
 */
export function ReaderLoadingShell() {
  return (
    <main
      id="main"
      aria-busy="true"
      className="min-h-screen bg-[var(--reader-bg)] text-[var(--reader-text)]"
    >
      <InkLogoLoader />
      <div className="fixed inset-x-0 top-0 z-40 h-[calc(4rem+env(safe-area-inset-top))] border-b border-current/10 bg-[var(--reader-paper)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-[calc(var(--reader-measure)+12rem)] items-center gap-2 px-2 sm:px-4">
          <IconGhost><ArrowLeft className="h-5 w-5" /></IconGhost>
          <div className="min-w-0 flex-1 space-y-2 px-1">
            <ReaderSkeleton className="h-3 w-36 max-w-[55%]" />
            <ReaderSkeleton className="h-4 w-52 max-w-[78%]" />
          </div>
          <ReaderSkeleton className="hidden h-7 w-14 rounded-full sm:block" />
          <span className="grid h-11 w-11 shrink-0 place-items-center text-sm font-semibold text-current/45">Aa</span>
          <IconGhost><List className="h-5 w-5" /></IconGhost>
        </div>
      </div>

      <article
        className="mx-auto w-full px-[18px] pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))] sm:px-8 sm:pt-[calc(6rem+env(safe-area-inset-top))]"
        style={{ maxWidth: "calc(var(--reader-measure) + 7rem)" }}
      >
        <div className="mx-auto sm:rounded-[8px] sm:border sm:border-current/10 sm:bg-[var(--reader-paper)] sm:px-10 sm:py-12 lg:px-14">
          <div className="mx-auto" style={{ maxWidth: "var(--reader-measure)" }}>
            <p role="status" className="font-mono text-xs font-semibold tracking-[0.12em] text-[var(--reader-accent)]">
              กำลังเปิดตอน
            </p>
            <ReaderSkeleton className="mt-4 h-8 w-4/5 max-w-xl" />
            <ReaderSkeleton className="mt-3 h-4 w-2/5" />

            <div className="mt-9 space-y-3" style={{ fontFamily: "var(--read-family)", lineHeight: "var(--read-leading)" }}>
              <ReaderSkeleton className="h-4 w-full" />
              <ReaderSkeleton className="h-4 w-11/12" />
              <ReaderSkeleton className="h-4 w-10/12" />
              <ReaderSkeleton className="h-4 w-full" />
              <ReaderSkeleton className="h-4 w-8/12" />
            </div>
          </div>
        </div>
      </article>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-current/10 bg-[var(--reader-paper)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid h-16 max-w-[720px] grid-cols-3 items-center gap-1 px-2">
          <ReaderSkeleton className="h-4 w-16" />
          <ReaderSkeleton className="mx-auto h-4 w-20" />
          <ReaderSkeleton className="ml-auto h-4 w-16" />
        </div>
      </div>
    </main>
  );
}
