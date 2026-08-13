"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, List, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Chapter, Novel } from "@/types/novel";
import { ChapterEnd } from "@/components/reader/chapter-end";
import { ChapterPaywall } from "@/components/reader/chapter-paywall";
import { ReaderSettings } from "@/components/reader/reader-settings";
import { LINE_HEIGHT_VALUES, WIDTH_VALUES, useReaderStore } from "@/stores/use-reader-store";

const FONT_CLASS = {
  looped: "reader-font-looped",
  sarabun: "reader-font-sarabun",
  anuphan: "reader-font-anuphan",
  serif: "reader-font-serif"
} as const;

/** จำนวนย่อหน้าที่โชว์ฟรีก่อน paywall — ห้ามหน้าขาวเปล่า (ส่วนที่ 6.7) */
const PAYWALL_TEASER_PARAGRAPHS = 2;

export function ReaderView({
  novel,
  chapter,
  previous,
  next,
  similar = []
}: {
  novel: Novel;
  chapter: Chapter;
  previous?: Chapter;
  next?: Chapter;
  similar?: Novel[];
}) {
  const router = useRouter();
  const prefs = useReaderStore((state) => state.prefs);
  const saveProgress = useReaderStore((state) => state.saveProgress);
  const bookmarks = useReaderStore((state) => state.bookmarks);
  const toggleBookmark = useReaderStore((state) => state.toggleBookmark);
  const unlockedChapters = useReaderStore((state) => state.unlockedChapters);

  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const bookmarked = bookmarks.includes(novel.slug);
  const locked = Boolean(chapter.locked) && !unlockedChapters.includes(`${novel.slug}:${chapter.number}`);

  const nextHref = next ? `/novel/${novel.slug}/chapter/${next.number}` : null;
  const previousHref = previous ? `/novel/${novel.slug}/chapter/${previous.number}` : null;
  const chaptersHref = `/novel/${novel.slug}/chapters`;

  const lastScrollY = useRef(0);
  const prefetchedNext = useRef(false);

  /* ------------------------------------------------------------------
     Scroll: progress + ซ่อน/แสดง chrome + prefetch ตอนถัดไปที่ 50%
     ------------------------------------------------------------------ */
  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const pct = scrollable <= 0 ? 100 : Math.min(100, Math.max(0, Math.round((y / scrollable) * 100)));
      setProgress(pct);

      // เลื่อนลง → ซ่อน / เลื่อนขึ้น → แสดง (ส่วนที่ 6.7)
      if (y > lastScrollY.current + 8 && y > 80) setChromeVisible(false);
      else if (y < lastScrollY.current - 8) setChromeVisible(true);
      lastScrollY.current = y;

      // Prefetch ตอนถัดไปทันทีที่อ่านถึง 50% → ตอนถัดไปต้องเปิดใน <100ms
      if (!prefetchedNext.current && pct >= 50 && nextHref) {
        prefetchedNext.current = true;
        router.prefetch(nextHref);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [nextHref, router]);

  // เปลี่ยนตอน → รีเซ็ตสถานะ prefetch
  useEffect(() => {
    prefetchedNext.current = false;
  }, [chapter.number, novel.slug]);

  // บันทึกตำแหน่งที่อ่าน (debounce ไม่ให้เขียน store ทุก scroll event)
  useEffect(() => {
    const id = window.setTimeout(() => {
      saveProgress({
        novelSlug: novel.slug,
        chapter: chapter.number,
        progress: Math.max(1, progress),
        updatedAt: new Date().toISOString()
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [progress, chapter.number, novel.slug, saveProgress]);

  /* ------------------------------------------------------------------
     Keyboard: ←/→ เปลี่ยนตอน, S ตั้งค่า, Esc กลับ (ส่วนที่ 6.7)
     T สลับธีมหน้าอ่านแบบวนลูป
     ------------------------------------------------------------------ */
  const setPrefs = useReaderStore((state) => state.setPrefs);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // อย่าไปแย่งคีย์ตอนผู้ใช้พิมพ์อยู่ในช่องกรอก
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (settingsOpen) return; // แผงตั้งค่าจัดการ Esc/Tab ของตัวเอง

      switch (event.key) {
        case "ArrowRight":
          if (nextHref) router.push(nextHref);
          break;
        case "ArrowLeft":
          if (previousHref) router.push(previousHref);
          break;
        case "Escape":
          router.push(`/novel/${novel.slug}`);
          break;
        default:
          break;
      }

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        setSettingsOpen(true);
      }
      if (key === "t") {
        const order = ["light", "sepia", "mist", "dark", "amoled"] as const;
        const index = order.indexOf(prefs.theme);
        setPrefs({ theme: order[(index + 1) % order.length] });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextHref, previousHref, novel.slug, router, settingsOpen, prefs.theme, setPrefs]);

  /* ------------------------------------------------------------------
     ล็อกหน้าจอไม่ให้ดับ (Screen Wake Lock API)
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (!prefs.keepScreenAwake || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // เบราว์เซอร์ปฏิเสธ (เช่นแบตต่ำ) — ไม่ต้องรบกวนผู้ใช้
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

  /** แตะกลางจอ → toggle chrome (ไม่ให้ชนกับการกดลิงก์/ปุ่ม/เลือกข้อความ) */
  const handleContentClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, [role='button']")) return;
    if (window.getSelection()?.toString()) return;
    setChromeVisible((visible) => !visible);
  }, []);

  const paragraphs = useMemo(
    () => (locked ? chapter.body.slice(0, PAYWALL_TEASER_PARAGRAPHS) : chapter.body),
    [locked, chapter.body]
  );

  const readerStyle = {
    "--reader-font-size": `${prefs.fontSize}px`,
    "--reader-line-height": String(LINE_HEIGHT_VALUES[prefs.lineHeight]),
    "--reader-paragraph-gap": `${prefs.paragraphGap}em`,
    "--reader-measure": WIDTH_VALUES[prefs.width]
  } as React.CSSProperties;

  return (
    <div
      className={cn("min-h-screen bg-[var(--reader-bg)] text-[var(--reader-text)]", `reader-theme-${prefs.theme}`, FONT_CLASS[prefs.font])}
      style={readerStyle}
    >
      {/* overlay ความสว่างสำหรับอ่านกลางคืน — ไม่กินคลิก */}
      {prefs.dim > 0 ? (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-30 bg-black" style={{ opacity: prefs.dim }} />
      ) : null}

      {/* Progress bar 2px — แสดงตลอดแม้ chrome ซ่อน (ส่วนที่ 6.7) */}
      <div
        role="progressbar"
        aria-label="ความคืบหน้าการอ่าน"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
      >
        <div
          className="h-full bg-[image:var(--grad-primary)] transition-[width] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ---------------- Top bar ---------------- */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 h-14 border-b border-current/10 bg-[var(--reader-bg)]/92 backdrop-blur-md",
          "transition-[transform,opacity] duration-[180ms] ease-[var(--ease-out)]",
          chromeVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto flex h-full max-w-[var(--reader-measure)] items-center gap-1 px-2">
          <Link
            href={`/novel/${novel.slug}`}
            aria-label="กลับไปหน้าเรื่อง"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] hover:bg-current/8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href={chaptersHref} className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">
            {novel.thaiTitle}
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="ตั้งค่าการอ่าน"
            aria-haspopup="dialog"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] hover:bg-current/8"
          >
            <Type className="h-5 w-5" />
          </button>
          <Link
            href={chaptersHref}
            aria-label="สารบัญตอน"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] hover:bg-current/8"
          >
            <List className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => toggleBookmark(novel.slug)}
            aria-label={bookmarked ? "เอาออกจากบุ๊กมาร์ก" : "บุ๊กมาร์กเรื่องนี้"}
            aria-pressed={bookmarked}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] hover:bg-current/8"
          >
            <Bookmark className={cn("h-5 w-5", bookmarked && "fill-current text-[var(--brand-pink)]")} />
          </button>
        </div>
      </header>

      {/* ---------------- เนื้อหา ---------------- */}
      <main
        id="main"
        onClick={handleContentClick}
        className="mx-auto w-full px-5 pb-28 pt-20 sm:px-8"
        style={{ maxWidth: "calc(var(--reader-measure) + 4rem)" }}
      >
        <article className="mx-auto" style={{ maxWidth: "var(--reader-measure)" }}>
          <p className="text-sm opacity-65">
            {novel.thaiTitle} · ตอนที่ {chapter.number}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-[1.4] sm:text-3xl">{chapter.title}</h1>

          {/* semantic <p> จริง เพื่อ screen reader และ TTS (ส่วนที่ 8) */}
          <div
            className="mt-8"
            style={{
              fontFamily: "var(--reader-family)",
              fontSize: "var(--reader-font-size)",
              lineHeight: "var(--reader-line-height)"
            }}
          >
            {paragraphs.map((paragraph, index) => {
              const isFading = locked && index === paragraphs.length - 1;
              return (
                <p
                  key={index}
                  style={{ marginBottom: "var(--reader-paragraph-gap)" }}
                  className={cn(isFading && "[mask-image:linear-gradient(to_bottom,black_20%,transparent_100%)]")}
                >
                  {paragraph}
                </p>
              );
            })}
          </div>

          {locked ? (
            <ChapterPaywall
              novelSlug={novel.slug}
              chapterNumber={chapter.number}
              price={chapter.coinPrice || 15}
              onUnlocked={() => setChromeVisible(true)}
            />
          ) : (
            <ChapterEnd
              novel={novel}
              chapter={chapter}
              next={next}
              similar={similar}
              onUnlockNext={() => nextHref && router.push(nextHref)}
            />
          )}
        </article>
      </main>

      {/* ---------------- Bottom bar ---------------- */}
      <nav
        aria-label="เปลี่ยนตอน"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-current/10 bg-[var(--reader-bg)]/92 backdrop-blur-md",
          "pb-[env(safe-area-inset-bottom)] transition-[transform,opacity] duration-[180ms] ease-[var(--ease-out)]",
          chromeVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto flex h-14 max-w-[var(--reader-measure)] items-center justify-between gap-2 px-2">
          {previousHref ? (
            <Link
              href={previousHref}
              prefetch
              aria-label="ตอนก่อนหน้า"
              className="flex h-11 items-center gap-1 rounded-[12px] px-3 text-sm font-semibold hover:bg-current/8"
            >
              <ChevronLeft className="h-4 w-4" />
              ตอนก่อน
            </Link>
          ) : (
            <span aria-hidden className="h-11 w-20" />
          )}

          <span className="tabular text-xs opacity-70">
            ตอนที่ {chapter.number} / {novel.chapters} · {progress}%
          </span>

          {nextHref ? (
            <Link
              href={nextHref}
              prefetch
              aria-label="ตอนถัดไป"
              className="flex h-11 items-center gap-1 rounded-[12px] px-3 text-sm font-semibold hover:bg-current/8"
            >
              ตอนถัดไป
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span aria-hidden className="h-11 w-20" />
          )}
        </div>
      </nav>

      <ReaderSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
