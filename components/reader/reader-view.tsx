"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, List, Type } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BookmarkButton } from "@/components/interactive/novel-actions";
import { ChapterEnd } from "@/components/reader/chapter-end";
import { ReaderSettings } from "@/components/reader/reader-settings";
import { createLatestTaskQueue } from "@/lib/domain/latest-task-queue";
import { cn } from "@/lib/utils";
import { LINE_HEIGHT_VALUES, WIDTH_VALUES, useReaderStore } from "@/stores/use-reader-store";
import type { ChapterSummary, Novel } from "@/types/novel";

const FONT_CLASS = {
  looped: "reader-font-looped",
  sarabun: "reader-font-sarabun",
  anuphan: "reader-font-anuphan",
  serif: "reader-font-serif",
} as const;

type ProgressWrite = {
  chapterId: string;
  progressPercent: number;
  position: number;
};

// Keep a single writer for the browser module so App Router chapter
// transitions cannot let an older keepalive request overtake a newer sample.
const progressWrites = createLatestTaskQueue<ProgressWrite>(async (payload) => {
  await fetch("/api/me/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
});

export function ReaderView({
  novel,
  chapter,
  previous,
  next,
  children,
  isAuthenticated = false,
  initialBookmarked,
  initialFollowing,
  locked = false,
}: {
  novel: Novel;
  chapter: ChapterSummary;
  previous?: ChapterSummary;
  next?: ChapterSummary;
  children: ReactNode;
  isAuthenticated?: boolean;
  initialBookmarked?: boolean;
  initialFollowing?: boolean;
  locked?: boolean;
}) {
  const router = useRouter();
  const prefs = useReaderStore((state) => state.prefs);
  const setPrefs = useReaderStore((state) => state.setPrefs);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [novelState, setNovelState] = useState<{ bookmarked: boolean; following: boolean } | null>(null);

  const nextHref = next && !next.locked ? `/novel/${novel.slug}/chapter/${next.number}` : null;
  const previousHref = previous ? `/novel/${novel.slug}/chapter/${previous.number}` : null;
  const chaptersHref = `/novel/${novel.slug}/chapters`;
  const lastScrollY = useRef(0);
  const progressRef = useRef(0);
  const prefetchedNext = useRef(false);
  const lastSaved = useRef({ percent: -1, at: 0 });

  const persistProgress = useCallback((force = false) => {
    if (!isAuthenticated || !chapter.id || locked) return;
    const percent = progressRef.current;
    const now = Date.now();
    const changed = Math.abs(percent - lastSaved.current.percent);
    if (!force && (changed < 5 || now - lastSaved.current.at < 10_000)) return;
    if (force && changed < 1) return;

    lastSaved.current = { percent, at: now };
    progressWrites.enqueue({
      chapterId: chapter.id,
      progressPercent: Math.max(0, Math.min(100, percent)),
      position: Math.max(0, Math.round(window.scrollY)),
    });
  }, [chapter.id, isAuthenticated, locked]);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const percent = scrollable <= 0 ? 100 : Math.min(100, Math.max(0, Math.round((y / scrollable) * 100)));
      progressRef.current = percent;
      setProgress(percent);

      if (y > lastScrollY.current + 8 && y > 80) setChromeVisible(false);
      else if (y < lastScrollY.current - 8) setChromeVisible(true);
      lastScrollY.current = y;

      if (!prefetchedNext.current && percent >= 50 && nextHref) {
        prefetchedNext.current = true;
        router.prefetch(nextHref);
      }
      persistProgress(false);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") persistProgress(true);
    };
    const onPageHide = () => persistProgress(true);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      persistProgress(true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [nextHref, persistProgress, router]);

  useEffect(() => {
    prefetchedNext.current = false;
    lastSaved.current = { percent: -1, at: 0 };
  }, [chapter.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void fetch(`/api/me/state?slug=${encodeURIComponent(novel.slug)}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => response.ok ? response.json() as Promise<{
        data?: { libraryStatus?: string | null; followed?: boolean };
      }> : null)
      .then((payload) => {
        if (!cancelled && payload?.data) {
          setNovelState({
            bookmarked: Boolean(payload.data.libraryStatus),
            following: Boolean(payload.data.followed),
          });
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated, novel.slug]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.metaKey || event.ctrlKey || event.altKey || settingsOpen) return;

      if (event.key === "ArrowRight" && nextHref) router.push(nextHref);
      else if (event.key === "ArrowLeft" && previousHref) router.push(previousHref);
      else if (event.key === "Escape") router.push(`/novel/${novel.slug}`);

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        setSettingsOpen(true);
      } else if (key === "t") {
        const order = ["light", "sepia", "mist", "dark", "amoled"] as const;
        const index = order.indexOf(prefs.theme);
        setPrefs({ theme: order[(index + 1) % order.length] });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextHref, novel.slug, prefs.theme, previousHref, router, setPrefs, settingsOpen]);

  useEffect(() => {
    if (!prefs.keepScreenAwake || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        // Browsers can deny wake locks (for example while battery saver is on).
      }
    };

    void request();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, [prefs.keepScreenAwake]);

  const handleContentClick = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, [role='button']") || window.getSelection()?.toString()) return;
    setChromeVisible((visible) => !visible);
  }, []);

  const readerStyle = {
    "--reader-font-size": `${prefs.fontSize}px`,
    "--reader-line-height": String(LINE_HEIGHT_VALUES[prefs.lineHeight]),
    "--reader-paragraph-gap": `${prefs.paragraphGap}em`,
    "--reader-measure": WIDTH_VALUES[prefs.width],
  } as CSSProperties;

  return (
    <div
      className={cn("min-h-screen bg-[var(--reader-bg)] text-[var(--reader-text)]", `reader-theme-${prefs.theme}`, FONT_CLASS[prefs.font])}
      style={readerStyle}
    >
      {prefs.dim > 0 ? <div aria-hidden className="pointer-events-none fixed inset-0 z-30 bg-black" style={{ opacity: prefs.dim }} /> : null}

      <div role="progressbar" aria-label="ความคืบหน้าการอ่าน" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
        <div className="h-full bg-[image:var(--grad-primary)] transition-[width] duration-[var(--dur-fast)] ease-[var(--ease-out)]" style={{ width: `${progress}%` }} />
      </div>

      <header className={cn("fixed inset-x-0 top-0 z-40 h-14 border-b border-current/10 bg-[var(--reader-bg)]/92 backdrop-blur-md transition-[transform,opacity] duration-[180ms] ease-[var(--ease-out)]", chromeVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0")}>
        <div className="mx-auto flex h-full max-w-[var(--reader-measure)] items-center gap-1 px-2">
          <Link href={`/novel/${novel.slug}`} aria-label="กลับไปหน้าเรื่อง" className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] hover:bg-current/8"><ArrowLeft className="h-5 w-5" /></Link>
          <Link href={chaptersHref} className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">{novel.thaiTitle}</Link>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="ตั้งค่าการอ่าน" aria-haspopup="dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] hover:bg-current/8"><Type className="h-5 w-5" /></button>
          <Link href={chaptersHref} aria-label="สารบัญตอน" className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] hover:bg-current/8"><List className="h-5 w-5" /></Link>
          <BookmarkButton slug={novel.slug} initialActive={novelState?.bookmarked ?? initialBookmarked} />
        </div>
      </header>

      <main id="main" onClick={handleContentClick} className="mx-auto w-full px-5 pb-28 pt-20 sm:px-8" style={{ maxWidth: "calc(var(--reader-measure) + 4rem)" }}>
        <article className="mx-auto" style={{ maxWidth: "var(--reader-measure)" }}>
          <p className="text-sm opacity-65">{novel.thaiTitle} · ตอนที่ {chapter.number}</p>
          <h1 className="mt-2 text-2xl font-semibold leading-[1.4] sm:text-3xl">{chapter.title}</h1>
          <div className="mt-8" style={{ fontFamily: "var(--reader-family)", fontSize: "var(--reader-font-size)", lineHeight: "var(--reader-line-height)" }}>
            {children}
          </div>

          {locked ? (
            <div className="mt-10 rounded-[16px] border border-current/15 p-5 text-center">
              <p className="font-semibold">ตอนนี้ยังไม่เปิดให้อ่าน</p>
              <p className="mt-2 text-sm opacity-70">ระบบไม่ได้เปิดการซื้อหรือปลดล็อกตอน จึงไม่ส่งเนื้อหาที่ถูกจำกัดมายังเบราว์เซอร์</p>
            </div>
          ) : (
            <ChapterEnd
              novel={novel}
              chapter={chapter}
              next={next}
              initialFollowing={novelState?.following ?? initialFollowing}
            />
          )}
        </article>
      </main>

      <nav aria-label="เปลี่ยนตอน" className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-current/10 bg-[var(--reader-bg)]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md transition-[transform,opacity] duration-[180ms] ease-[var(--ease-out)]", chromeVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0")}>
        <div className="mx-auto flex h-14 max-w-[var(--reader-measure)] items-center justify-between gap-2 px-2">
          {previousHref ? <Link href={previousHref} prefetch aria-label="ตอนก่อนหน้า" className="flex h-11 items-center gap-1 rounded-[12px] px-3 text-sm font-semibold hover:bg-current/8"><ChevronLeft className="h-4 w-4" />ตอนก่อนหน้า</Link> : <span aria-hidden className="h-11 w-20" />}
          <span className="tabular text-xs opacity-70">ตอนที่ {chapter.number} / {novel.chapters} · {progress}%</span>
          {nextHref ? <Link href={nextHref} prefetch aria-label="ตอนถัดไป" className="flex h-11 items-center gap-1 rounded-[12px] px-3 text-sm font-semibold hover:bg-current/8">ตอนถัดไป<ChevronRight className="h-4 w-4" /></Link> : <span aria-hidden className="h-11 w-20" />}
        </div>
      </nav>

      <ReaderSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
