"use client";

import { LocateFixed, LockKeyhole, Search } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { NovelCatalogResume, useNovelResumeProgress } from "@/components/reader/novel-resume-actions";
import { cn } from "@/lib/utils";
import { markChapterNavigation } from "@/stores/use-reader-store";
import type { ChapterCatalogPage, NovelResumeServerProgress } from "@/types/novel";

type ChapterListProps = {
  slug: string;
  catalog: ChapterCatalogPage;
  serverProgress?: NovelResumeServerProgress | null;
  latestChapterNumber?: number;
};

function formatChapterNumber(value: number) {
  return Number.isInteger(value) ? value.toLocaleString("th-TH") : value.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

export function ChapterList({
  slug,
  catalog,
  serverProgress,
  latestChapterNumber,
}: ChapterListProps) {
  const action = `/novel/${slug}/chapters`;
  const rangeCount = Math.ceil(catalog.catalogTotal / 100);
  const resume = useNovelResumeProgress(slug, serverProgress);
  const currentChapterNumber = resume?.progress.chapterNumber;

  useEffect(() => {
    if (!catalog.jumpFound || catalog.jumpChapter === null) return;
    const frame = window.requestAnimationFrame(() => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-jump-target="true"]'));
      const target = targets.find((item) => item.getClientRects().length > 0);
      if (!target) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      target.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [catalog.jumpChapter, catalog.jumpFound]);

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (catalog.query) params.set("q", catalog.query);
    if (catalog.order !== "latest") params.set("order", catalog.order);
    if (catalog.rangeStart !== null) params.set("from", String(catalog.rangeStart));
    if (catalog.rangeEnd !== null) params.set("to", String(catalog.rangeEnd));
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return `${action}${query ? `?${query}` : ""}`;
  };

  return (
    <section aria-label="รายชื่อตอน" className="overflow-hidden rounded-[8px] border border-border bg-card">
      <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <form action={action} method="get" role="search" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_96px]">
          <label className="relative">
            <span className="sr-only">ค้นหาตอนจากสารบัญทั้งหมด</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={catalog.query}
              placeholder="ค้นหาเลขตอนหรือชื่อตอนทั้งหมด"
              className="h-11 w-full rounded-[8px] border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-[var(--brand-emphasis)]"
            />
          </label>
          <label>
            <span className="sr-only">เรียงลำดับตอน</span>
            <select name="order" defaultValue={catalog.order} className="h-11 w-full rounded-[8px] border border-input bg-background px-3 text-sm">
              <option value="latest">ตอนล่าสุดก่อน</option>
              <option value="oldest">ตอนแรกก่อน</option>
            </select>
          </label>
          {catalog.rangeStart !== null ? <input type="hidden" name="from" value={catalog.rangeStart} /> : null}
          {catalog.rangeEnd !== null ? <input type="hidden" name="to" value={catalog.rangeEnd} /> : null}
          <button type="submit" className="h-11 rounded-[8px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ค้นหา</button>
        </form>

        <form action={action} method="get" className="grid grid-cols-[minmax(0,1fr)_48px] gap-2">
          <label>
            <span className="sr-only">ข้ามไปยังตอน</span>
            <input name="jump" inputMode="decimal" placeholder="ไปตอนที่…" className="h-11 w-full rounded-[8px] border border-input bg-background px-3 text-sm" />
          </label>
          <input type="hidden" name="order" value={catalog.order} />
          <button type="submit" aria-label="ไปยังตอน" className="grid h-11 w-12 place-items-center rounded-[8px] border border-border hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)]">
            <LocateFixed className="h-4 w-4" />
          </button>
        </form>
      </div>

      {rangeCount > 1 ? (
        <form action={action} method="get" className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <label htmlFor="chapter-range" className="text-xs font-semibold text-muted-foreground">ช่วงตอน</label>
          <select id="chapter-range" name="from" defaultValue={catalog.rangeStart ?? 0} className="h-11 min-w-44 rounded-[8px] border border-input bg-background px-3 text-sm">
            <option value="0">ทุกตอน</option>
            {Array.from({ length: rangeCount }, (_, index) => {
              const start = index * 100 + 1;
              const end = Math.min((index + 1) * 100, catalog.catalogTotal);
              return <option key={start} value={start}>ลำดับ {start.toLocaleString("th-TH")}–{end.toLocaleString("th-TH")}</option>;
            })}
          </select>
          <input type="hidden" name="order" value={catalog.order} />
          {catalog.query ? <input type="hidden" name="q" value={catalog.query} /> : null}
          <button type="submit" className="h-11 rounded-[8px] border border-border px-4 text-sm font-semibold hover:border-[var(--brand-emphasis)]">แสดงช่วง</button>
          {catalog.rangeStart !== null ? <Link href={pageHref(1).replace(/[?&](from|to)=[^&]*/gu, "").replace("?&", "?").replace(/[?&]$/u, "")} className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[var(--brand-emphasis)]">ล้างช่วง</Link> : null}
        </form>
      ) : null}

      <NovelCatalogResume slug={slug} serverProgress={serverProgress} />

      {catalog.jumpChapter !== null && catalog.jumpFound ? (
        <p role="status" className="border-b border-border bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)] px-4 py-3 text-sm text-foreground">
          กำลังแสดงตอนที่ {formatChapterNumber(catalog.jumpChapter)}
        </p>
      ) : catalog.jumpChapter !== null ? (
        <p role="status" className="border-b border-border bg-muted px-4 py-3 text-sm text-foreground">ไม่พบตอนที่ {formatChapterNumber(catalog.jumpChapter)} ในผลลัพธ์นี้</p>
      ) : null}

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/55 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-32 px-4 py-3 font-medium">ตอน</th>
              <th scope="col" className="px-4 py-3 font-medium">ชื่อตอน</th>
              <th scope="col" className="w-36 px-4 py-3 font-medium">อัปเดต</th>
              <th scope="col" className="w-28 px-4 py-3 text-right font-medium">จำนวนคำ</th>
              <th scope="col" className="w-24 px-4 py-3 text-right font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {catalog.items.map((chapter) => {
              const href = `/novel/${slug}/chapter/${chapter.number}`;
              const isCurrent = chapter.number === currentChapterNumber;
              const isJumpTarget = catalog.jumpFound && chapter.number === catalog.jumpChapter;
              const isLatest = chapter.number === latestChapterNumber;
              return (
                <tr
                  key={chapter.id ?? chapter.number}
                  data-jump-target={isJumpTarget ? "true" : undefined}
                  className={cn(
                    "transition-colors",
                    isJumpTarget
                      ? "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] outline outline-1 -outline-offset-1 outline-[var(--brand-emphasis)]"
                      : isCurrent
                        ? "bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]"
                        : "hover:bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]",
                  )}
                >
                  <td className="px-4 py-3"><span className="font-mono text-xs text-[var(--brand-emphasis)]">ตอน {formatChapterNumber(chapter.number)}</span></td>
                  <td className="px-4 py-3">
                    <Link href={href} prefetch={false} onClick={() => markChapterNavigation(slug, chapter.number)} aria-current={isCurrent ? "page" : undefined} className="inline-flex min-h-11 items-center font-medium hover:text-[var(--brand-emphasis)]">{chapter.title}</Link>
                    {isJumpTarget ? <span className="ml-2 rounded-full border border-[var(--brand-emphasis)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-emphasis)]">ตอนที่ค้นหา</span> : null}
                    {isCurrent ? <span className="ml-2 rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">กำลังอ่าน</span> : null}
                    {isLatest ? <span className="ml-2 text-[11px] font-semibold text-[var(--brand-emphasis)]">· ตอนล่าสุด</span> : null}
                  </td>
                  <td className="tabular px-4 py-3 text-xs text-muted-foreground">{chapter.updatedAt}</td>
                  <td className="tabular px-4 py-3 text-right text-xs text-muted-foreground">{chapter.wordCount?.toLocaleString("th-TH") ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium">{chapter.locked ? <span className="inline-flex items-center gap-1 text-muted-foreground"><LockKeyhole className="h-3 w-3" />จำกัด</span> : <span className="text-[var(--brand-emphasis)]">ฟรี</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border sm:hidden">
        {catalog.items.map((chapter) => {
          const isCurrent = chapter.number === currentChapterNumber;
          const isJumpTarget = catalog.jumpFound && chapter.number === catalog.jumpChapter;
          const isLatest = chapter.number === latestChapterNumber;
          return (
            <li
              key={chapter.id ?? chapter.number}
              data-jump-target={isJumpTarget ? "true" : undefined}
              className={cn(
                isJumpTarget
                  ? "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] outline outline-1 -outline-offset-1 outline-[var(--brand-emphasis)]"
                  : isCurrent && "bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]",
              )}
            >
              <Link href={`/novel/${slug}/chapter/${chapter.number}`} prefetch={false} onClick={() => markChapterNavigation(slug, chapter.number)} aria-current={isCurrent ? "page" : undefined} className="block min-h-[76px] px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]">
                <div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-[var(--brand-emphasis)]">ตอน {formatChapterNumber(chapter.number)}</span><span className="text-[11px] text-muted-foreground">{chapter.updatedAt}</span></div>
                <p className="mt-1 font-medium leading-[1.6]">{chapter.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                  <span>{chapter.wordCount?.toLocaleString("th-TH") ?? "—"} คำ · {chapter.locked ? "จำกัดการเข้าถึง" : "ฟรี"}</span>
                  {isJumpTarget ? <span className="font-semibold text-[var(--brand-emphasis)]">· ตอนที่ค้นหา</span> : null}
                  {isCurrent ? <span className="font-semibold text-[var(--brand-emphasis)]">· กำลังอ่าน</span> : null}
                  {isLatest ? <span className="font-semibold text-[var(--brand-emphasis)]">· ตอนล่าสุด</span> : null}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {catalog.items.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">ไม่พบตอนที่ตรงกับคำค้นหรือช่วงที่เลือก</p> : null}

      {catalog.totalPages > 1 ? (
        <nav aria-label="แบ่งหน้าสารบัญ" className="flex items-center justify-center gap-3 border-t border-border p-4">
          {catalog.page > 1 ? <Link href={pageHref(catalog.page - 1)} className="flex min-h-11 items-center rounded-[8px] border border-border px-4 text-sm font-semibold">หน้าก่อน</Link> : null}
          <span className="tabular text-sm text-muted-foreground">หน้า {catalog.page} / {catalog.totalPages}</span>
          {catalog.page < catalog.totalPages ? <Link href={pageHref(catalog.page + 1)} className="flex min-h-11 items-center rounded-[8px] border border-border px-4 text-sm font-semibold">หน้าถัดไป</Link> : null}
        </nav>
      ) : null}
    </section>
  );
}
