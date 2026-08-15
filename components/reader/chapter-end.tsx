"use client";

import { Bell, ChevronRight, Lock, Zap } from "lucide-react";
import Link from "next/link";

import { FollowButton } from "@/components/interactive/novel-actions";
import type { ChapterSummary, Novel } from "@/types/novel";

function BrandDivider() {
  return (
    <div aria-hidden className="flex items-center gap-3">
      <span className="h-px flex-1 bg-current opacity-15" />
      <span className="grid h-7 w-7 place-items-center border border-[var(--brand-primary)] text-[var(--brand-primary)]"><Zap className="h-3.5 w-3.5" /></span>
      <span className="h-px flex-1 bg-current opacity-15" />
    </div>
  );
}

export function ChapterEnd({
  novel,
  chapter,
  next,
  initialFollowing,
}: {
  novel: Novel;
  chapter: ChapterSummary;
  next?: ChapterSummary;
  initialFollowing?: boolean;
}) {
  return (
    <footer className="mt-12 flex flex-col gap-6">
      <BrandDivider />

      <p className="text-sm font-semibold">อ่านจบตอนที่ {chapter.number} แล้ว</p>

      {next ? (
        next.locked ? (
          <div className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-[8px] border border-current/15 px-5 text-center text-sm font-semibold opacity-75">
            <Lock className="h-4 w-4 shrink-0" />
            ตอนที่ {next.number} ยังไม่เปิดให้อ่านบนระบบนี้
          </div>
        ) : (
          <Link
            href={`/novel/${novel.slug}/chapter/${next.number}`}
            prefetch
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--brand-primary)] px-5 text-center text-base font-semibold text-white shadow-[var(--sh-brand)]"
          >
            <span className="line-clamp-2">ตอนถัดไป  ตอนที่ {next.number}: {next.title}</span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </Link>
        )
      ) : (
        <div className="flex flex-col gap-3 rounded-[8px] border border-current/15 p-4 text-center">
          <p className="text-sm font-semibold">คุณอ่านถึงตอนล่าสุดแล้ว</p>
          <div className="mx-auto">
            <FollowButton slug={novel.slug} initialActive={initialFollowing} />
          </div>
          <p className="flex items-center justify-center gap-1 text-xs opacity-65">
            <Bell className="h-3.5 w-3.5" /> ติดตามเพื่อดูตอนใหม่ในส่วนอัปเดตบนหน้าแรก
          </p>
        </div>
      )}

    </footer>
  );
}
