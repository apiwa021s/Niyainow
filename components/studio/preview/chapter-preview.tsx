"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";

import { ChapterBody } from "@/components/reader/chapter-body";
import { chapterDraftStorageKey } from "@/components/studio/editor/use-chapter-draft";
import { cn } from "@/lib/utils";

type Viewport = "desktop" | "mobile";

function readDraftContent(storySlug: string, chapterKey: string, fallback: { title: string; content: string }) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(chapterDraftStorageKey(storySlug, chapterKey));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { title: string; content: string };
    return parsed.title || parsed.content ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The real reader, not a mock of it (spec §23) — same `.read-sheet`/`.read-body`
 * classes and `--read-*` tokens as production (components/reader/reader-view.tsx,
 * components/reader/chapter-body.tsx). Only the outer frame width changes
 * between Desktop and Mobile; the typography underneath never does.
 *
 * Preview opens in its own tab (a fresh navigation, not shared client state),
 * so it reads the same local autosave backup the editor just wrote — falling
 * back to whatever the caller already knows server-side.
 */
export function ChapterPreview({
  storySlug,
  chapterKey,
  novelTitle,
  chapterNumber,
  fallbackTitle,
  fallbackContent,
}: {
  storySlug: string;
  chapterKey: string;
  novelTitle: string;
  chapterNumber: number;
  fallbackTitle: string;
  fallbackContent: string;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [draft] = useState(() => readDraftContent(storySlug, chapterKey, { title: fallbackTitle, content: fallbackContent }));
  const chapterTitle = draft.title || fallbackTitle;
  const paragraphs = draft.content.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  return (
    <div data-read-theme="light" className="min-h-dvh bg-[var(--read-bg)]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--read-border)] bg-[var(--read-bg)]/95 px-4 py-3 backdrop-blur-md">
        <p className="text-sm font-semibold text-[var(--read-text)]">ตัวอย่างสำหรับผู้อ่าน</p>
        <div className="flex items-center gap-1 rounded-full border border-[var(--read-border)] p-1">
          <button
            type="button"
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full",
              viewport === "desktop" ? "bg-[var(--read-text)] text-[var(--read-bg)]" : "text-[var(--read-muted)]",
            )}
            aria-label="มุมมองเดสก์ท็อป"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full",
              viewport === "mobile" ? "bg-[var(--read-text)] text-[var(--read-bg)]" : "text-[var(--read-muted)]",
            )}
            aria-label="มุมมองมือถือ"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={cn("mx-auto py-10 transition-[max-width] duration-200", viewport === "mobile" ? "max-w-[390px] px-4" : "px-5 sm:px-8")} style={viewport === "desktop" ? { maxWidth: "calc(var(--reader-measure) + 7rem)" } : undefined}>
        <article className="read-sheet mx-auto sm:rounded-[8px] sm:px-10 sm:py-12 lg:px-14" style={{ maxWidth: "var(--reader-measure)" }}>
          <header className="pb-7">
            <p className="read-kicker read-num">ตอน {chapterNumber}</p>
            <p className="mt-2 text-sm text-[var(--reader-accent)]">{novelTitle}</p>
            <h1 className="read-title mt-2">{chapterTitle}</h1>
          </header>
          <ChapterBody paragraphs={paragraphs} />
        </article>
      </div>
    </div>
  );
}
