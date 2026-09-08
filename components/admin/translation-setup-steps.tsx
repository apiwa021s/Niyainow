import { Check, FileSearch, ListChecks, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "เลือกต้นฉบับ", description: "เลือกเรื่องและภาษาปลายทาง", icon: FileSearch },
  { number: 2, label: "ตรวจ Default Profile", description: "ตรวจผลวิเคราะห์ชื่อและเรื่องย่อ", icon: SlidersHorizontal },
  { number: 3, label: "เลือกตอนและเริ่มแปล", description: "เลือกได้สูงสุด 100 ตอนต่อคิว", icon: ListChecks },
] as const;

export function TranslationSetupSteps({ activeStep, completedThrough }: { activeStep: 1 | 2 | 3; completedThrough: number }) {
  return (
    <nav aria-label="ขั้นตอนเตรียมงานแปล">
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const complete = step.number <= completedThrough;
          const active = step.number === activeStep;
          const Icon = step.icon;
          return (
            <li
              key={step.number}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-[14px] border px-4 py-3 transition-colors",
                active && "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8",
                complete && !active && "border-emerald-500/30 bg-emerald-500/8",
                !active && !complete && "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              <span className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold",
                active && "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white",
                complete && !active && "border-emerald-500 bg-emerald-500 text-white",
                !active && !complete && "border-border bg-card",
              )}>
                {complete && !active ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">ขั้นตอน {step.number}</span>
                <span className="block truncate text-sm font-semibold text-foreground">{step.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{step.description}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
