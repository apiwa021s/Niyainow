import { AlertTriangle, Check } from "lucide-react";

import type { StoryHealth } from "@/components/studio/mock-data";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHECKS: { key: keyof StoryHealth; label: string }[] = [
  { key: "hasCover", label: "มีปก" },
  { key: "hasTagline", label: "มีคำโปรย" },
  { key: "hasGenre", label: "เลือกหมวดแล้ว" },
  { key: "hasMaturitySettings", label: "ระดับเนื้อหาครบ" },
  { key: "hasFreeIntroChapter", label: "มีตอนฟรีสำหรับผู้อ่านใหม่" },
];

/**
 * A short checklist beats a generic notification bell for a new writer —
 * it says exactly what's missing and gives one button that fixes the thing
 * that matters most (spec §8).
 */
export function StoryHealthCard({ storySlug, health }: { storySlug: string; health: StoryHealth }) {
  const missing = CHECKS.filter((item) => !health[item.key]);
  if (missing.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">ความพร้อมของเรื่อง</h2>
      <ul className="mt-3 grid gap-1.5">
        {CHECKS.map((item) => {
          const done = health[item.key];
          return (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              {done ? (
                <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle aria-hidden className="h-4 w-4 shrink-0 text-amber-500" />
              )}
              <span className={cn(!done && "text-(--text-secondary)")}>{item.label}</span>
            </li>
          );
        })}
      </ul>
      {!health.hasFreeIntroChapter ? (
        <ButtonLink href={`/studio/works/${storySlug}/pricing`} variant="outline" className="mt-4 w-full">
          ตั้งตอนทดลองอ่าน
        </ButtonLink>
      ) : null}
    </section>
  );
}
