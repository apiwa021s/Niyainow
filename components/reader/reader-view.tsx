"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Ellipsis, List, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BookmarkButton } from "@/components/interactive/novel-actions";
import { ChapterEnd } from "@/components/reader/chapter-end";
import { ReaderSettings } from "@/components/reader/reader-settings";
import { createLatestTaskQueue } from "@/lib/domain/latest-task-queue";
import { cn } from "@/lib/utils";
import {
  consumeChapterNavigation,
  LINE_HEIGHT_VALUES,
  markChapterNavigation,
  READER_THEME_VALUES,
  selectReadingPosition,
  WIDTH_VALUES,
  useReaderStore,
  type LocalReadingProgress,
} from "@/stores/use-reader-store";
import type { ChapterSummary, ChapterWindow, Novel } from "@/types/novel";

const FONT_CLASS = {
  looped: "reader-font-looped",
  anuphan: "reader-font-anuphan",
  serif: "reader-font-serif",
} as const;

type ProgressWrite = {
  chapterId: string;
  progressPercent: number;
  position: number;
  completed: boolean;
};

type ReaderLibraryStatus = "READING" | "PLAN_TO_READ" | "COMPLETED" | "DROPPED";

export type ReaderInitialProgress = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterSortOrder: number;
  progressPercent: number;
  position: number;
  completed: boolean;
  lastReadAt: string;
};

function currentParagraphAnchor() {
  const paragraphs = document.querySelectorAll<HTMLElement>("[data-reader-paragraph]");
  const readingLine = Math.min(180, window.innerHeight * 0.28);
  for (const paragraph of paragraphs) {
    if (paragraph.getBoundingClientRect().bottom >= readingLine) {
      const value = paragraph.dataset.readerParagraph;
      return value === undefined ? undefined : `paragraph:${value}`;
    }
  }
  return undefined;
}

// Keep a single writer for the browser module so App Router chapter
// transitions cannot let an older keepalive request overtake a newer sample.
const progressWrites = createLatestTaskQueue<ProgressWrite>(async (payload) => {
  const response = await fetch("/api/me/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  if (!response.ok) throw new Error("progress_write_failed");
});

export function ReaderView({
  novel,
  chapter,
  previous,
  next,
  chapterWindow,
  children,
  isAuthenticated = false,
  initialBookmarked,
  initialLibraryStatus,
  initialFollowing,
  initialProgress,
  locked = false,
}: {
  novel: Novel;
  chapter: ChapterSummary;
  previous?: ChapterSummary;
  next?: ChapterSummary;
  chapterWindow: ChapterWindow;
  children: ReactNode;
  isAuthenticated?: boolean;
  initialBookmarked?: boolean;
  initialLibraryStatus?: ReaderLibraryStatus | null;
  initialFollowing?: boolean;
  initialProgress?: ReaderInitialProgress | null;
  locked?: boolean;
}) {
  const router = useRouter();
  const prefs = useReaderStore((state) => state.prefs);
  const setPrefs = useReaderStore((state) => state.setPrefs);
  const sidebarOpen = useReaderStore((state) => state.sidebarOpen);
  const setSidebarOpen = useReaderStore((state) => state.setSidebarOpen);
  const hasHydrated = useReaderStore((state) => state.hasHydrated);
  const saveLocalProgress = useReaderStore((state) => state.saveLocalProgress);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const modalReturnFocusRef = useRef<HTMLElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [novelState, setNovelState] = useState<{ libraryStatus: ReaderLibraryStatus | null; following: boolean } | null>(() =>
    initialLibraryStatus !== undefined && initialFollowing !== undefined
      ? { libraryStatus: initialLibraryStatus, following: initialFollowing }
      : null,
  );

  const nextHref = next && !next.locked ? `/novel/${novel.slug}/chapter/${next.number}` : null;
  const previousHref = previous ? `/novel/${novel.slug}/chapter/${previous.number}` : null;
  const chaptersHref = `/novel/${novel.slug}/chapters`;
  const chapterKey = `${novel.slug}:${chapter.id ?? chapter.number}`;
  const lastScrollY = useRef(0);
  const progressRef = useRef(0);
  const prefetchedNext = useRef(false);
  const restoration = useRef({ chapterKey, complete: false });
  const scrollFrame = useRef<number | null>(null);
  const lastSaved = useRef({ percent: -1, position: -1, at: 0 });
  const restoredLocalSync = useRef<string | null>(null);

  const persistProgress = useCallback((force = false) => {
    if (locked || restoration.current.chapterKey !== chapterKey || !restoration.current.complete) return;
    const percent = progressRef.current;
    const position = Math.max(0, Math.round(window.scrollY));
    const now = Date.now();
    const changed = Math.abs(percent - lastSaved.current.percent);
    const moved = Math.abs(position - lastSaved.current.position);
    if (!force && changed < 2 && moved < 500 && now - lastSaved.current.at < 8_000) return;
    if (force && changed < 0.5 && moved < 80) return;

    lastSaved.current = { percent, position, at: now };
    if (hasHydrated) {
      const local: LocalReadingProgress = {
        novelId: novel.id,
        novelSlug: novel.slug,
        novelTitle: novel.thaiTitle,
        cover: novel.cover,
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        chapterSortOrder: chapter.sortOrder ?? chapter.number,
        progressPercent: Math.max(0, Math.min(100, percent)),
        position,
        anchor: currentParagraphAnchor(),
        updatedAt: now,
      };
      saveLocalProgress(local);
    }

    if (!isAuthenticated || !chapter.id) return;
    progressWrites.enqueue({
      chapterId: chapter.id,
      progressPercent: Math.max(0, Math.min(100, percent)),
      position,
      completed: !next && novel.status === "completed" && percent >= 95,
    });
  }, [chapter.id, chapter.number, chapter.sortOrder, chapter.title, chapterKey, hasHydrated, isAuthenticated, locked, next, novel.cover, novel.id, novel.slug, novel.status, novel.thaiTitle, saveLocalProgress]);

  useEffect(() => {
    const sampleScroll = () => {
      scrollFrame.current = null;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const percent = scrollable <= 0 ? 100 : Math.min(100, Math.max(0, Math.round((y / scrollable) * 100)));
      progressRef.current = percent;
      setProgress(percent);

      if (y > lastScrollY.current + 8 && y > 80) {
        setChromeVisible(false);
        setMoreOpen(false);
      }
      else if (y < lastScrollY.current - 8) setChromeVisible(true);
      if (percent >= 94) setChromeVisible(true);
      lastScrollY.current = y;

      if (!prefetchedNext.current && percent >= 70 && nextHref) {
        prefetchedNext.current = true;
        const connection = (navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string };
        }).connection;
        const constrained = connection?.saveData === true
          || connection?.effectiveType === "slow-2g"
          || connection?.effectiveType === "2g";
        if (!constrained) router.prefetch(nextHref);
      }
      persistProgress(false);
    };
    const onScroll = () => {
      if (scrollFrame.current === null) scrollFrame.current = window.requestAnimationFrame(sampleScroll);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") persistProgress(true);
    };
    const onPageHide = () => persistProgress(true);

    sampleScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      persistProgress(true);
      if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [nextHref, persistProgress, router]);

  useEffect(() => {
    if (!hasHydrated || restoration.current.chapterKey !== chapterKey || restoration.current.complete) return;

    const completeAt = (top: number, maximum: number, restoredExistingPosition = false) => {
      if (restoration.current.chapterKey !== chapterKey) return;
      const percent = maximum <= 0 ? 100 : Math.min(100, Math.max(0, Math.round((top / maximum) * 100)));
      progressRef.current = percent;
      setProgress(percent);
      lastScrollY.current = top;
      lastSaved.current = restoredExistingPosition
        ? { percent, position: Math.round(top), at: Date.now() }
        : { percent: -1, position: -1, at: 0 };
      restoration.current.complete = true;
    };

    if (consumeChapterNavigation(novel.slug, chapter.number)) {
      window.scrollTo({ top: 0, behavior: "auto" });
      completeAt(0, Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
      return;
    }

    const local = useReaderStore.getState().localProgress[novel.slug];
    const serverCandidate = initialProgress?.chapterNumber === chapter.number
      ? {
          chapterNumber: initialProgress.chapterNumber,
          progressPercent: initialProgress.progressPercent,
          position: initialProgress.position,
          updatedAt: Date.parse(initialProgress.lastReadAt) || 0,
          anchor: undefined,
        }
      : null;
    const candidate = selectReadingPosition({ local, server: serverCandidate, chapterNumber: chapter.number });
    if (
      candidate === local
      && isAuthenticated
      && chapter.id
      && restoredLocalSync.current !== chapterKey
    ) {
      restoredLocalSync.current = chapterKey;
      progressWrites.enqueue({
        chapterId: chapter.id,
        progressPercent: Math.max(0, Math.min(100, candidate.progressPercent)),
        position: Math.max(0, Math.round(candidate.position)),
        completed: !next && novel.status === "completed" && candidate.progressPercent >= 95,
      });
    }
    if (!candidate || (candidate.position < 80 && candidate.progressPercent < 2)) {
      completeAt(window.scrollY, Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const anchorIndex = candidate.anchor?.match(/^paragraph:(\d+)$/u)?.[1];
        const anchor = anchorIndex
          ? document.querySelector<HTMLElement>(`[data-reader-paragraph="${anchorIndex}"]`)
          : null;
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const positionFromPercent = maximum * Math.max(0, Math.min(100, candidate.progressPercent)) / 100;
        const requested = anchor
          ? window.scrollY + anchor.getBoundingClientRect().top - Math.min(96, window.innerHeight * 0.12)
          : candidate.position <= maximum ? candidate.position : positionFromPercent;
        const top = Math.max(0, Math.min(maximum, requested));
        window.scrollTo({ top, behavior: "auto" });
        completeAt(top, maximum, true);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [chapter.id, chapter.number, chapterKey, hasHydrated, initialProgress, isAuthenticated, next, novel.slug, novel.status]);

  useEffect(() => {
    if (!isAuthenticated || (initialLibraryStatus !== undefined && initialFollowing !== undefined)) return;
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
            libraryStatus: (payload.data.libraryStatus as ReaderLibraryStatus | null | undefined) ?? null,
            following: Boolean(payload.data.followed),
          });
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [initialFollowing, initialLibraryStatus, isAuthenticated, novel.slug]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (moreOpen) {
          setMoreOpen(false);
          moreButtonRef.current?.focus();
        }
        else if (sidebarOpen) setSidebarOpen(false);
        else if (!settingsOpen) router.push(`/novel/${novel.slug}`);
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("a, button, input, textarea, select, summary, [contenteditable='true']")) return;
      if (event.metaKey || event.ctrlKey || event.altKey || settingsOpen) return;

      if (event.key === "ArrowRight" && nextHref) {
        markChapterNavigation(novel.slug, next!.number);
        router.push(nextHref);
      } else if (event.key === "ArrowLeft" && previousHref) {
        markChapterNavigation(novel.slug, previous!.number);
        router.push(previousHref);
      }

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        modalReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setSettingsOpen(true);
      } else if (key === "t") {
        const order = ["light", "sepia", "dark", "amoled"] as const;
        const index = order.indexOf(prefs.theme);
        setPrefs({ theme: order[(index + 1) % order.length] });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen, next, nextHref, novel.slug, prefs.theme, previous, previousHref, router, setPrefs, setSidebarOpen, settingsOpen, sidebarOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [moreOpen]);

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

  const modalOpen = settingsOpen || sidebarOpen;

  useEffect(() => {
    if (!modalOpen) return;

    const scrollY = window.scrollY;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBody.overflow;
      body.style.position = previousBody.position;
      body.style.top = previousBody.top;
      body.style.left = previousBody.left;
      body.style.right = previousBody.right;
      body.style.width = previousBody.width;
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [modalOpen]);

  const handleContentClick = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, [role='button']") || window.getSelection()?.toString()) return;
    setMoreOpen(false);
    setChromeVisible((visible) => !visible);
  }, []);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);
  const openSettings = useCallback(() => {
    modalReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMoreOpen(false);
    setSettingsOpen(true);
  }, []);
  const openSidebar = useCallback(() => {
    modalReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMoreOpen(false);
    setSidebarOpen(true);
  }, [setSidebarOpen]);
  const navigateChapter = useCallback((chapterNumber: number) => {
    persistProgress(true);
    markChapterNavigation(novel.slug, chapterNumber);
  }, [novel.slug, persistProgress]);

  const theme = READER_THEME_VALUES[prefs.theme];
  const chapterWindowIndex = chapterWindow.items.findIndex((item) =>
    item.id && chapter.id ? item.id === chapter.id : item.number === chapter.number,
  );
  const chapterPosition = chapterWindowIndex >= 0
    ? chapterWindow.startPosition + chapterWindowIndex
    : undefined;
  const readerStyle = {
    "--reader-font-size": `${prefs.fontSize}px`,
    "--reader-line-height": String(LINE_HEIGHT_VALUES[prefs.lineHeight]),
    "--reader-paragraph-gap": `${prefs.paragraphGap}em`,
    "--reader-measure": WIDTH_VALUES[prefs.width],
    "--reader-bg": theme.bg,
    "--reader-paper": theme.paper,
    "--reader-text": theme.fg,
    "--reader-accent": theme.accent,
    "--reader-action": theme.action,
    colorScheme: theme.scheme,
  } as CSSProperties;

  return (
    <div
      className={cn("min-h-screen bg-[var(--reader-bg)] text-[var(--reader-text)]", FONT_CLASS[prefs.font])}
      style={readerStyle}
    >
      <div inert={modalOpen} aria-hidden={modalOpen ? true : undefined}>
        {prefs.dim > 0 ? <div aria-hidden className="pointer-events-none fixed inset-0 z-30 bg-black" style={{ opacity: prefs.dim }} /> : null}

        <div role="progressbar" aria-label="ความคืบหน้าการอ่าน" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
          <div className="h-full bg-[var(--reader-accent)] transition-[width] duration-[var(--dur-fast)] ease-[var(--ease-out)]" style={{ width: `${progress}%` }} />
        </div>

      <header aria-hidden={!chromeVisible ? true : undefined} inert={!chromeVisible} className={cn("fixed inset-x-0 top-0 z-40 h-16 border-b border-current/10 bg-[var(--reader-paper)] transition-[transform,opacity] duration-[180ms] ease-[var(--ease-out)]", chromeVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0")}>
        <div className="mx-auto flex h-full max-w-[calc(var(--reader-measure)+12rem)] items-center gap-1 px-2 sm:px-4">
          <Link href={`/novel/${novel.slug}`} aria-label="กลับไปหน้าเรื่อง" className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] hover:bg-current/8"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0 flex-1 px-1">
            <span className="block truncate text-xs opacity-65">{novel.thaiTitle}</span>
            <span className="block truncate text-sm font-semibold">ตอนที่ {chapter.number} · {chapter.title}</span>
          </div>
          <button type="button" onClick={openSettings} aria-label="ตั้งค่าการอ่าน" aria-haspopup="dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-sm font-semibold hover:bg-current/8">Aa</button>
          <div ref={moreMenuRef} className="relative shrink-0">
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setMoreOpen((value) => !value)}
              aria-label="เมนูเพิ่มเติม"
              aria-controls="reader-more-menu"
              aria-expanded={moreOpen}
              className="grid h-11 w-11 place-items-center rounded-[8px] hover:bg-current/8"
            >
              <Ellipsis className="h-5 w-5" />
            </button>
            {moreOpen ? (
              <div id="reader-more-menu" role="group" aria-label="ตัวเลือกเพิ่มเติมสำหรับการอ่าน" className="absolute right-0 top-12 w-60 rounded-[8px] border border-current/12 bg-[var(--reader-paper)] p-2 shadow-[var(--sh-2)]">
                <div className="flex min-h-12 items-center justify-between gap-3 border-b border-current/10 px-2 pb-2 text-sm">
                  <span className="font-medium">จัดการคลัง</span>
                  <BookmarkButton
                    slug={novel.slug}
                    initialActive={initialLibraryStatus === undefined ? initialBookmarked : undefined}
                    initialStatus={novelState ? novelState.libraryStatus : initialLibraryStatus}
                  />
                </div>
                <Link href={`/novel/${novel.slug}`} className="mt-1 flex min-h-11 items-center rounded-[6px] px-3 text-sm hover:bg-current/8">รายละเอียดเรื่อง</Link>
                <Link href={chaptersHref} className="flex min-h-11 items-center rounded-[6px] px-3 text-sm hover:bg-current/8">สารบัญทั้งหมด</Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main" onClick={handleContentClick} className="mx-auto w-full px-[18px] pb-28 pt-20 sm:px-8 sm:pt-24" style={{ maxWidth: "calc(var(--reader-measure) + 7rem)" }}>
        <article className="mx-auto sm:rounded-[8px] sm:border sm:border-current/10 sm:bg-[var(--reader-paper)] sm:px-10 sm:py-12 lg:px-14" style={{ maxWidth: "calc(var(--reader-measure) + 7rem)" }}>
          <div className="mx-auto" style={{ maxWidth: "var(--reader-measure)" }}>
          <p className="font-mono text-xs text-[var(--reader-accent)]">ตอน {chapter.number}</p>
          <p className="mt-2 text-sm opacity-60">{novel.thaiTitle}</p>
          <h1 className="mt-2 font-serif text-2xl font-semibold leading-[1.45] sm:text-3xl">{chapter.title}</h1>
          <div aria-hidden className="ink-divider mt-6" />
          <div className="mt-8 text-[length:var(--reader-font-size)] sm:text-[length:calc(var(--reader-font-size)+1px)]" style={{ fontFamily: "var(--reader-family)", lineHeight: "var(--reader-line-height)" }}>
            {children}
          </div>

          {locked ? (
            <div className="mt-10 border-y border-current/15 px-5 py-6 text-center">
              <p className="font-semibold">ตอนนี้ยังไม่เปิดให้อ่าน</p>
              <p className="mt-2 text-sm opacity-70">ระบบไม่ได้เปิดการซื้อหรือปลดล็อกตอน จึงไม่ส่งเนื้อหาที่ถูกจำกัดมายังเบราว์เซอร์</p>
            </div>
          ) : (
            <ChapterEnd
              novel={novel}
              chapter={chapter}
              chapterPosition={chapterPosition}
              totalChapters={chapterWindow.total}
              previous={previous}
              next={next}
              initialFollowing={novelState?.following ?? initialFollowing}
              onNavigateChapter={navigateChapter}
            />
          )}
          </div>
        </article>
      </main>

      <nav aria-label="เปลี่ยนตอน" aria-hidden={!chromeVisible ? true : undefined} inert={!chromeVisible} className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-current/10 bg-[var(--reader-bg)] pb-[env(safe-area-inset-bottom)] transition-[transform,opacity] duration-[180ms] ease-[var(--ease-out)]", chromeVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0")}>
        <div className="mx-auto grid h-14 max-w-[720px] grid-cols-3 items-center gap-1 px-2">
          {previousHref ? <Link href={previousHref} onClick={() => navigateChapter(previous!.number)} aria-label="ตอนก่อนหน้า" className="flex h-12 items-center justify-start gap-1 rounded-[8px] px-3 text-sm font-semibold hover:bg-current/8"><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">ตอนก่อนหน้า</span></Link> : <span aria-hidden />}
          <button type="button" onClick={openSidebar} aria-controls="reader-chapter-sidebar" aria-expanded={sidebarOpen} className="flex h-12 items-center justify-center gap-2 rounded-[8px] text-sm font-semibold hover:bg-current/8"><List className="h-4 w-4" />สารบัญ</button>
          {nextHref ? <Link href={nextHref} onClick={() => navigateChapter(next!.number)} aria-label="ตอนถัดไป" className="flex h-12 items-center justify-end gap-1 rounded-[8px] px-3 text-sm font-semibold hover:bg-current/8"><span className="hidden sm:inline">ตอนถัดไป</span><ChevronRight className="h-4 w-4" /></Link> : <span aria-hidden />}
        </div>
      </nav>
      </div>

      <ReaderSidebar novel={novel} current={chapter} chapterWindow={chapterWindow} open={sidebarOpen} onClose={closeSidebar} onNavigateChapter={navigateChapter} returnFocusRef={modalReturnFocusRef} />
      <ReaderSettings open={settingsOpen} onClose={closeSettings} returnFocusRef={modalReturnFocusRef} />
    </div>
  );
}

function ReaderSidebar({
  novel,
  current,
  chapterWindow,
  open,
  onClose,
  onNavigateChapter,
  returnFocusRef,
}: {
  novel: Novel;
  current: ChapterSummary;
  chapterWindow: ChapterWindow;
  open: boolean;
  onClose: () => void;
  onNavigateChapter: (chapterNumber: number) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const chaptersHref = `/novel/${novel.slug}/chapters`;
  const firstVisibleChapter = chapterWindow.items[0];
  const lastVisibleChapter = chapterWindow.items[chapterWindow.items.length - 1];
  const earlierJump = chapterWindow.earlierBoundary?.number
    ?? (firstVisibleChapter?.number !== current.number ? firstVisibleChapter?.number : undefined);
  const laterJump = chapterWindow.laterBoundary?.number
    ?? (lastVisibleChapter?.number !== current.number ? lastVisibleChapter?.number : undefined);
  const visible = chapterWindow.items.filter((chapter) => {
    const needle = query.trim().toLocaleLowerCase("th");
    return !needle || chapter.title.toLocaleLowerCase("th").includes(needle) || String(chapter.number).includes(needle);
  });

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = returnFocusRef.current
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [onClose, open, returnFocusRef]);

  return (
    <>
      {open ? <button type="button" tabIndex={-1} aria-hidden="true" aria-label="ปิดสารบัญ" onClick={onClose} className="fixed inset-0 z-40 bg-black/40" /> : null}
      <aside ref={panelRef} id="reader-chapter-sidebar" role="dialog" aria-modal={open ? "true" : undefined} aria-label="สารบัญตอน" className={cn("fixed inset-y-0 left-0 z-50 flex w-[min(340px,88vw)] flex-col border-r border-current/10 bg-[var(--reader-paper)] shadow-[var(--sh-3)] transition-transform duration-[var(--dur-base)]", open ? "translate-x-0" : "-translate-x-full")} aria-hidden={!open} inert={!open}>
        <div className="flex h-16 items-center justify-between gap-3 border-b border-current/10 px-4">
          <div className="min-w-0"><p className="editorial-kicker">TABLE OF CONTENTS</p><p className="truncate font-serif text-sm font-semibold">{novel.thaiTitle}</p></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="ปิดสารบัญ" className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] hover:bg-current/8"><X className="h-5 w-5" /></button>
        </div>
        <label className="relative m-4">
          <span className="sr-only">ค้นหาในรายการตอนใกล้เคียง</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-55" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาในตอนใกล้เคียง" className="h-11 w-full rounded-[8px] border border-current/15 bg-transparent pl-9 pr-3 text-sm outline-none focus:border-[var(--reader-accent)]" />
        </label>
        <p className="px-4 pb-2 text-xs opacity-60">
          ตอนลำดับ {chapterWindow.startPosition.toLocaleString("th-TH")}–{chapterWindow.endPosition.toLocaleString("th-TH")} จาก {chapterWindow.total.toLocaleString("th-TH")}
        </p>
        <nav aria-label="รายชื่อตอน" className="min-h-0 flex-1 overflow-y-auto px-2 pb-5">
          {chapterWindow.hasEarlier && earlierJump !== undefined ? <Link href={`${chaptersHref}?order=oldest&jump=${earlierJump}`} onClick={onClose} className="mb-1 flex min-h-11 items-center justify-center rounded-[8px] border border-current/12 text-xs font-semibold hover:bg-current/6">ดูตอนก่อนหน้านี้ในสารบัญ</Link> : null}
          {visible.map((item) => {
            const active = item.id ? item.id === current.id : item.number === current.number;
            return <Link key={item.id ?? item.number} href={`/novel/${novel.slug}/chapter/${item.number}`} prefetch={false} onClick={() => { onNavigateChapter(item.number); onClose(); }} aria-current={active ? "page" : undefined} className={cn("grid min-h-[58px] grid-cols-[54px_1fr] items-center gap-2 border-b border-current/8 px-3 py-2 text-sm", active ? "border-l-2 border-l-[var(--reader-accent)] bg-current/8 text-[var(--reader-accent)]" : "hover:bg-current/6")}><span className="font-mono text-[11px]">ตอน {item.number}</span><span className="line-clamp-2 font-medium leading-[1.5]">{item.title}</span></Link>;
          })}
          {visible.length === 0 ? <p className="px-3 py-8 text-center text-sm opacity-65">ไม่พบตอนในช่วงใกล้เคียงนี้</p> : null}
          {chapterWindow.hasLater && laterJump !== undefined ? <Link href={`${chaptersHref}?order=oldest&jump=${laterJump}`} onClick={onClose} className="mt-2 flex min-h-11 items-center justify-center rounded-[8px] border border-current/12 text-xs font-semibold hover:bg-current/6">ดูตอนถัดไปในสารบัญ</Link> : null}
        </nav>
      </aside>
    </>
  );
}
