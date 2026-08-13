"use client";

import Link from "next/link";
import { Bookmark, ChevronLeft, ChevronRight, Home, Minus, Plus, Type } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo } from "react";
import type { Chapter, Novel } from "@/types/novel";
import { Button, ButtonLink } from "@/components/ui/button";
import { useReaderStore } from "@/stores/use-reader-store";

export function ReaderView({ novel, chapter, previous, next }: { novel: Novel; chapter: Chapter; previous?: Chapter; next?: Chapter }) {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize, saveProgress, bookmarks, toggleBookmark } = useReaderStore();
  const bookmarked = bookmarks.includes(novel.slug);
  const activeTheme = theme === "light" || theme === "sepia" ? theme : "dark";

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable <= 0 ? 100 : Math.min(100, Math.max(1, Math.round((window.scrollY / scrollable) * 100)));
      saveProgress({ novelSlug: novel.slug, chapter: chapter.number, progress, updatedAt: new Date().toISOString() });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [chapter.number, novel.slug, saveProgress]);

  const chapterHref = useMemo(() => `/novel/${novel.slug}/chapters`, [novel.slug]);

  return (
    <main className="min-h-screen pt-20" style={{ background: "var(--reader-bg)", color: "var(--reader-text)" }}>
      <div className="sticky top-0 z-40 border-b border-black/10 bg-[var(--reader-bg)]/92 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <ButtonLink href="/" variant="ghost" size="icon"><Home className="h-4 w-4" /></ButtonLink>
          <Link href={chapterHref} className="min-w-0 truncate text-sm font-medium">{novel.thaiTitle} · ตอนที่ {chapter.number}</Link>
          <Button variant="ghost" size="icon" onClick={() => toggleBookmark(novel.slug)} aria-label="บุ๊กมาร์ก">
            <Bookmark className={bookmarked ? "h-4 w-4 fill-current text-[var(--brand-accent)]" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-sm opacity-70">{novel.thaiTitle}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">{chapter.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-black/5 p-2 font-sans">
          <Button variant="ghost" size="icon" onClick={() => setFontSize(Math.max(16, fontSize - 1))} aria-label="ลดขนาดตัวอักษร"><Minus className="h-4 w-4" /></Button>
          <span className="flex items-center gap-2 px-2 text-sm"><Type className="h-4 w-4" />{fontSize}px</span>
          <Button variant="ghost" size="icon" onClick={() => setFontSize(Math.min(28, fontSize + 1))} aria-label="เพิ่มขนาดตัวอักษร"><Plus className="h-4 w-4" /></Button>
          <select value={activeTheme} onChange={(event) => setTheme(event.target.value)} className="ml-auto h-9 rounded-md border border-black/10 bg-transparent px-2 text-sm">
            <option value="dark">มืด</option>
            <option value="light">สว่าง</option>
            <option value="sepia">ถนอมสายตา</option>
          </select>
        </div>
        <div className="mt-8 space-y-7 font-serif leading-[2.05]" style={{ fontSize }}>
          {chapter.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-12 flex items-center justify-between gap-3 border-t border-black/10 pt-6 font-sans">
          {previous ? <ButtonLink href={`/novel/${novel.slug}/chapter/${previous.number}`} variant="outline"><ChevronLeft className="h-4 w-4" />ตอนก่อนหน้า</ButtonLink> : <Button disabled variant="secondary">ตอนก่อนหน้า</Button>}
          {next ? <ButtonLink href={`/novel/${novel.slug}/chapter/${next.number}`}><ChevronRight className="h-4 w-4" />ตอนถัดไป</ButtonLink> : <ButtonLink href={`/novel/${novel.slug}`} variant="secondary">กลับหน้ารายละเอียด</ButtonLink>}
        </div>
      </article>
    </main>
  );
}
