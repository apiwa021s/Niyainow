"use client";

import { ArrowLeft, ArrowRight, Check, Cloud, CloudCheck, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = [
  { id: 1, label: "ข้อมูลเรื่อง" },
  { id: 2, label: "แนวและสไตล์" },
  { id: 3, label: "เนื้อหา 20+" },
  { id: 4, label: "ตรวจสอบและสร้างเรื่อง" },
] as const;

export type SaveState = "idle" | "saving" | "saved";

export function WizardStepper({ current, onJump }: { current: number; onJump: (step: number) => void }) {
  return (
    <>
      {/* Desktop: the whole path, with finished steps clickable. */}
      <ol className="hidden items-center gap-2 sm:flex" aria-label="ขั้นตอนการสร้างเรื่อง">
        {WIZARD_STEPS.map((step, index) => {
          const done = current > step.id;
          const active = current === step.id;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => (done ? onJump(step.id) : undefined)}
                disabled={!done}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 items-center gap-2 rounded-full px-2 text-left",
                  done && "cursor-pointer hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-bold tabular-nums",
                    done && "border-transparent bg-brand-primary text-white",
                    active && "border-[var(--brand-emphasis)] bg-accent-subtle text-[var(--brand-emphasis)]",
                    !done && !active && "border-border text-(--text-tertiary)",
                  )}
                >
                  {done ? <Check aria-hidden className="h-4 w-4" /> : `0${step.id}`}
                </span>
                <span
                  className={cn(
                    "hidden min-w-0 truncate text-sm lg:block",
                    active ? "font-semibold" : "text-(--text-tertiary)",
                  )}
                >
                  {step.label}
                </span>
              </button>
              {index < WIZARD_STEPS.length - 1 ? (
                <span aria-hidden className={cn("h-px min-w-3 flex-1", current > step.id ? "bg-brand-primary" : "bg-border")} />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Mobile: position plus a bar. Four labels never fit at 360px. */}
      <div className="sm:hidden">
        <p className="text-sm font-semibold">
          ขั้นตอน {current} จาก {WIZARD_STEPS.length}
          <span className="ml-2 font-normal text-(--text-secondary)">{WIZARD_STEPS[current - 1].label}</span>
        </p>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={WIZARD_STEPS.length}
          aria-valuenow={current}
          aria-label="ความคืบหน้าการสร้างเรื่อง"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-brand-primary transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)]"
            style={{ width: `${(current / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}

export function AutosaveStatus({ state }: { state: SaveState }) {
  return (
    <p aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-(--text-tertiary)">
      {state === "saving" ? (
        <>
          <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
          กำลังบันทึก…
        </>
      ) : state === "saved" ? (
        <>
          <CloudCheck aria-hidden className="h-3.5 w-3.5 text-emerald-500" />
          บันทึกอัตโนมัติแล้ว
        </>
      ) : (
        <>
          <Cloud aria-hidden className="h-3.5 w-3.5" />
          ระบบบันทึกร่างให้อัตโนมัติ
        </>
      )}
    </p>
  );
}

/**
 * Sticky on mobile so the pair is always reachable, static on desktop where the
 * page is short enough to see the end. `pb-safe` keeps it clear of the home bar;
 * the bar sits below the fold of the keyboard rather than under it because the
 * form scrolls independently.
 */
export function StickyWizardNavigation({
  onBack,
  onNext,
  backLabel = "ย้อนกลับ",
  nextLabel = "ต่อไป",
  nextDisabled,
  secondary,
}: {
  onBack?: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  secondary?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 mt-6 border-t border-border bg-(--bg-base)/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
      <div className="flex items-center gap-3">
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {backLabel}
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          {secondary}
          <Button type="button" variant="primary" onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuestionBlock({
  question,
  description,
  error,
  children,
  action,
}: {
  question: string;
  description?: string;
  error?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{question}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-(--text-secondary)">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <span aria-hidden>⚠</span>
          {error}
        </p>
      ) : null}
    </section>
  );
}
