"use client";

import { BookOpen, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isReaderRoute } from "@/components/layout/site-chrome";
import { selectLatestLocalProgress, useReaderStore } from "@/stores/use-reader-store";

/**
 * The floating resume bar (brief §6.1) — the button that should be pressed more
 * than any other on the site. It rides above the bottom nav and reads the same
 * device-local record the reader writes, so it works signed out too.
 *
 * Renders nothing until the persisted store has hydrated: emitting it during
 * SSR would either invent a reader or mismatch the client markup.
 */
export function ContinueReadingBar() {
  const pathname = usePathname();
  const hydrated = useReaderStore((state) => state.hasHydrated);
  const records = useReaderStore((state) => state.localProgress);
  const removeLocalProgress = useReaderStore((state) => state.removeLocalProgress);

  const progress = hydrated ? selectLatestLocalProgress(records) : null;
  if (!progress || isReaderRoute(pathname)) return null;

  const percent = Math.max(0, Math.min(100, Math.round(progress.progressPercent)));

  return (
    <div data-continue-reading-bar className="motion-enter border-t border-border bg-surface px-2 py-1.5">
      <div className="flex items-center gap-2.5">
        <Link
          href={`/novel/${progress.novelSlug}/chapter/${progress.chapterNumber}`}
          className="tap-target flex min-w-0 flex-1 items-center gap-2.5"
        >
          <span className="relative aspect-[2/3] w-8 shrink-0 overflow-hidden rounded-(--r-sm) bg-surface-recessed">
            <Image src={progress.cover} alt="" fill sizes="32px" className="object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{progress.novelTitle}</span>
            <span className="mt-1 flex items-center gap-2">
              <span
                role="progressbar"
                aria-label={`อ่านต่อ ${progress.novelTitle} ตอนที่ ${progress.chapterNumber} ค้างไว้ ${percent}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-recessed"
              >
                <span className="block h-full bg-accent-base" style={{ width: `${percent}%` }} />
              </span>
              <span className="tabular text-xs text-(--text-tertiary)">
                ตอน {progress.chapterNumber} · {percent}%
              </span>
            </span>
          </span>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-base text-accent-on">
            <BookOpen className="h-4 w-4" aria-hidden />
          </span>
        </Link>
        <button
          type="button"
          onClick={() => removeLocalProgress(progress.novelSlug)}
          aria-label={`ซ่อน ${progress.novelTitle} จากแถบอ่านต่อ`}
          className="grid h-11 w-8 shrink-0 place-items-center rounded-(--r-sm) text-(--text-tertiary) hover:bg-surface-subtle hover:text-(--text-primary)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
