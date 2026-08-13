"use client";

import Link from "next/link";
import { Bell, ChevronRight, Lock, ThumbsDown, ThumbsUp, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Chapter, Novel } from "@/types/novel";
import { useReaderStore } from "@/stores/use-reader-store";

/** เส้นคั่นลายเซ็นแบรนด์ — สายฟ้ากลางเส้น gradient (ส่วนที่ 6.7) */
function BrandDivider() {
  return (
    <div aria-hidden className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[image:var(--grad-primary)] opacity-40" />
      <Zap className="h-4 w-4 text-[var(--brand-pink)]" />
      <span className="h-px flex-1 bg-[image:var(--grad-hot)] opacity-40" />
    </div>
  );
}

/**
 * ท้ายตอน (ส่วนที่ 6.7)
 * หลักการ "ไม่มี dead end" (ส่วนที่ 4 ข้อ 3) — ต้องมีทางไปต่อเสมอ
 */
export function ChapterEnd({
  novel,
  chapter,
  next,
  similar,
  onUnlockNext
}: {
  novel: Novel;
  chapter: Chapter;
  next?: Chapter;
  similar: Novel[];
  onUnlockNext?: () => void;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const coins = useReaderStore((state) => state.coins);
  const follows = useReaderStore((state) => state.follows);
  const toggleFollow = useReaderStore((state) => state.toggleFollow);
  const isUnlocked = useReaderStore((state) => state.unlockedChapters);

  const nextLocked = Boolean(next?.locked) && !isUnlocked.includes(`${novel.slug}:${next?.number}`);
  const following = follows.includes(novel.slug);

  return (
    <footer className="mt-12 flex flex-col gap-6">
      <BrandDivider />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">อ่านจบตอนที่ {chapter.number} แล้ว</p>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">ชอบตอนนี้ไหม</span>
          <button
            type="button"
            aria-label="ชอบตอนนี้"
            aria-pressed={vote === "up"}
            onClick={() => setVote(vote === "up" ? null : "up")}
            className={cn(
              "grid h-11 w-11 place-items-center rounded-[12px] border transition-colors",
              vote === "up" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/12" : "border-current/20 hover:bg-current/8"
            )}
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="ไม่ชอบตอนนี้"
            aria-pressed={vote === "down"}
            onClick={() => setVote(vote === "down" ? null : "down")}
            className={cn(
              "grid h-11 w-11 place-items-center rounded-[12px] border transition-colors",
              vote === "down" ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/12" : "border-current/20 hover:bg-current/8"
            )}
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {next ? (
        nextLocked ? (
          <button
            type="button"
            onClick={onUnlockNext}
            className="grid min-h-[56px] w-full place-items-center rounded-[16px] bg-[image:var(--grad-primary)] px-5 text-base font-semibold text-white shadow-[var(--sh-brand)]"
          >
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              ปลดล็อกตอนที่ {next.number} · {next.coinPrice} เหรียญ
            </span>
            <span className="text-xs font-normal opacity-85 tabular">เหรียญคงเหลือ {coins.toLocaleString("th-TH")}</span>
          </button>
        ) : (
          <Link
            href={`/novel/${novel.slug}/chapter/${next.number}`}
            prefetch
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[16px] bg-[image:var(--grad-primary)] px-5 text-center text-base font-semibold text-white shadow-[var(--sh-brand)]"
          >
            <span className="line-clamp-2">
              ตอนถัดไป → ตอนที่ {next.number}: {next.title}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </Link>
        )
      ) : (
        <div className="flex flex-col gap-3 rounded-[16px] border border-current/15 p-4 text-center">
          <p className="text-sm font-semibold">คุณอ่านถึงตอนล่าสุดแล้ว</p>
          <button
            type="button"
            onClick={() => toggleFollow(novel.slug)}
            aria-pressed={following}
            className={cn(
              "mx-auto flex min-h-12 items-center justify-center gap-2 rounded-[12px] px-5 text-sm font-semibold",
              following ? "border border-current/20" : "bg-[image:var(--grad-primary)] text-white shadow-[var(--sh-brand)]"
            )}
          >
            <Bell className="h-4 w-4" />
            {following ? "ติดตามอยู่ · จะแจ้งเตือนตอนใหม่" : "ติดตามเพื่อรับแจ้งเตือนตอนใหม่"}
          </button>
        </div>
      )}

      {similar.length > 0 ? (
        <section aria-label="เรื่องที่คล้ายกัน" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">เรื่องที่คล้ายกัน</h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {similar.slice(0, 6).map((item) => (
              <li key={item.slug}>
                <Link href={`/novel/${item.slug}`} prefetch className="group flex flex-col gap-2">
                  {/* aspect 2:3 fix — กัน layout shift (ส่วนที่ 4 ข้อ 7) */}
                  <span className="block aspect-[2/3] overflow-hidden rounded-[12px] bg-current/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.cover}
                      alt={`ปกนิยาย ${item.thaiTitle}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-snug">{item.thaiTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </footer>
  );
}
