"use client";

import { Check, Flame, Gift, Lock, Play } from "lucide-react";
import { useState } from "react";

import { studioStarterStats } from "@/components/studio/mock-data";
import { academyTracks } from "@/components/studio/mock-workflow";
import { StudioPageHeader } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TRACKS = [
  { key: "translator", label: "สายนักแปล" },
  { key: "author", label: "สายนักเขียน" },
] as const;

/**
 * A learning path, not a game.
 *
 * No leaderboard, no hearts, no streak-break warnings — none of that teaches
 * anyone to write, it only makes people who fell behind feel watched. The
 * streak here is a plain fact about the last twelve days and says nothing about
 * tomorrow.
 */
export default function AcademyPage() {
  const [track, setTrack] = useState<"translator" | "author">("translator");
  const lessons = academyTracks[track];
  const done = lessons.filter((lesson) => lesson.status === "done").length;

  return (
    <>
      <StudioPageHeader
        eyebrow="ACADEMY"
        title="Academy"
        description="บทเรียนสั้น ๆ เรื่องละไม่กี่นาที เรียนตอนไหนก็ได้ ไม่มีกำหนดส่ง"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label="เลือกสายการเรียน">
          {TRACKS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={track === item.key}
              onClick={() => setTrack(item.key)}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)]",
                track === item.key ? "bg-[var(--brand-primary)] text-white" : "text-(--text-secondary) hover:text-(--text-primary)",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1.5 text-xs font-semibold text-[var(--brand-emphasis)]">
          <Flame aria-hidden className="h-3.5 w-3.5" />
          เขียนต่อเนื่อง {studioStarterStats.streakDays} วัน
        </p>
      </div>

      <p className="mb-4 text-sm text-(--text-secondary)">
        เรียนจบแล้ว {done} จาก {lessons.length} บทในสายนี้
      </p>

      <ol className="relative grid gap-3">
        {/* The connecting line reads as one path rather than a stack of cards. */}
        <span aria-hidden className="absolute bottom-8 left-5 top-8 w-px bg-border sm:left-6" />

        {lessons.map((lesson) => {
          const locked = lesson.status === "locked";
          const finished = lesson.status === "done";

          return (
            <li key={lesson.id} className="relative flex gap-3 sm:gap-4">
              <span
                aria-hidden
                className={cn(
                  "z-10 mt-3 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-sm font-bold sm:h-12 sm:w-12",
                  finished && "border-transparent bg-[var(--success,#33C997)] text-white",
                  lesson.status === "available" && "border-[var(--brand-primary)] bg-(--bg-base) text-[var(--brand-emphasis)]",
                  locked && "border-border bg-(--bg-base) text-(--text-tertiary)",
                )}
              >
                {finished ? <Check className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : lesson.id}
              </span>

              <div
                className={cn(
                  "min-w-0 flex-1 rounded-xl border p-4 sm:p-5",
                  locked ? "border-border bg-card/60" : "border-border bg-card",
                  lesson.status === "available" && "border-[var(--brand-emphasis)]",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className={cn("font-semibold", locked && "text-(--text-tertiary)")}>{lesson.title}</h2>
                  <span className="shrink-0 text-xs text-(--text-tertiary)">{lesson.minutes} นาที</span>
                </div>

                {lesson.reward ? (
                  <p
                    className={cn(
                      "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                      finished ? "bg-accent-subtle text-[var(--brand-emphasis)]" : "bg-muted text-(--text-secondary)",
                    )}
                  >
                    <Gift aria-hidden className="h-3.5 w-3.5" />
                    {lesson.reward}
                  </p>
                ) : null}

                {locked ? (
                  <p className="mt-3 text-xs leading-6 text-(--text-tertiary)">เปิดให้เรียนเมื่อจบบทก่อนหน้า</p>
                ) : (
                  <Button type="button" variant={finished ? "outline" : "primary"} size="sm" className="mt-3">
                    <Play aria-hidden className="h-3.5 w-3.5" />
                    {finished ? "อ่านซ้ำ" : "เริ่มเรียน"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
