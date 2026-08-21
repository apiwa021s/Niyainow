"use client";

import { Flame } from "lucide-react";

import { HEAT_LEVELS } from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

/**
 * The 1–5 heat-level grid + its live description, shared between the story
 * wizard's "how explicit is this story" question and a chapter's per-chapter
 * override (components/studio/publish/chapter-heat-override.tsx) — same
 * picker, different caller decides what happens around it.
 */
export function HeatLevelPicker({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (level: number) => void;
  className?: string;
}) {
  const selectedHeat = HEAT_LEVELS.find((item) => item.level === value);

  return (
    <div className={cn("grid gap-3", className)}>
      <div role="radiogroup" aria-label="ระดับความเข้มข้น" className="grid grid-cols-5 gap-2">
        {HEAT_LEVELS.map((item) => {
          const selected = value === item.level;
          return (
            <button
              key={item.level}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`ระดับ ${item.level} ${item.nameTh}`}
              onClick={() => onChange(item.level)}
              className={cn(
                "tap-target grid min-h-24 place-items-center gap-1 rounded-xl border px-1 py-3 transition-colors duration-[var(--dur-fast)]",
                selected
                  ? "border-[var(--brand-emphasis)] bg-accent-subtle shadow-[var(--sh-brand)]"
                  : "border-border bg-card hover:border-[var(--brand-emphasis)]",
              )}
            >
              <span aria-hidden className="flex">
                {Array.from({ length: item.level }).map((_, index) => (
                  <Flame
                    key={index}
                    className={cn("h-3.5 w-3.5", selected ? "text-[var(--brand-emphasis)]" : "text-(--text-tertiary)")}
                  />
                ))}
              </span>
              <span className={cn("text-sm font-bold tabular-nums", selected && "text-[var(--brand-emphasis)]")}>
                {item.level}
              </span>
              <span className="text-[11px] text-(--text-tertiary)">{item.shortTh}</span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="rounded-xl bg-muted/50 p-4">
        {selectedHeat ? (
          <>
            <p className="text-sm font-semibold">
              ระดับ {selectedHeat.level} · {selectedHeat.nameTh}
            </p>
            <p className="mt-1 text-sm leading-7 text-(--text-secondary)">{selectedHeat.descriptionTh}</p>
          </>
        ) : (
          <p className="text-sm leading-7 text-(--text-secondary)">
            แตะที่ระดับด้านบนเพื่อดูคำอธิบาย เลือกตามเนื้อเรื่องจริง ไม่ต้องเลือกให้สูงหรือต่ำกว่าที่เป็น
          </p>
        )}
      </div>
    </div>
  );
}
