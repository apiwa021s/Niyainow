import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bookmark, CheckCircle2, Clock3, Compass, Heart, LibraryBig } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import {
  collectionPageHref,
  type CollectionPagination,
} from "@/lib/validation/collection-pagination";
import type { UserNovelListItem } from "@/services/user-service";

export type LibraryMode = "reading" | "following" | "bookmarks" | "completed" | "history";

const MODE_COPY: Record<LibraryMode, { title: string; description: string; emptyTitle: string; emptyDescription: string }> = {
  reading: {
    title: "กำลังอ่าน",
    description: "กลับสู่ตอนและตำแหน่งล่าสุดที่ซิงก์ไว้ในบัญชี",
    emptyTitle: "ยังไม่มีเรื่องที่กำลังอ่าน",
    emptyDescription: "เริ่มอ่านนิยายสักตอน แล้วเรื่องล่าสุดจะปรากฏที่นี่พร้อมตำแหน่งอ่าน",
  },
  following: {
    title: "กำลังติดตาม",
    description: "เรื่องที่คุณเลือกติดตามเพื่อกลับมาดูตอนใหม่",
    emptyTitle: "ยังไม่ได้ติดตามนิยาย",
    emptyDescription: "กดติดตามจากหน้ารายละเอียดนิยาย เพื่อรวมเรื่องที่รอตอนใหม่ไว้ที่นี่",
  },
  bookmarks: {
    title: "บันทึกไว้อ่าน",
    description: "เรื่องที่เก็บไว้เริ่มอ่านภายหลัง โดยไม่ปะปนกับเรื่องที่กำลังอ่าน",
    emptyTitle: "ยังไม่มีเรื่องที่บันทึกไว้",
    emptyDescription: "เพิ่มนิยายเข้ารายการไว้อ่าน แล้วกลับมาเลือกเรื่องถัดไปได้ทุกเมื่อ",
  },
  completed: {
    title: "อ่านจบแล้ว",
    description: "ชั้นรองสำหรับเรื่องที่คุณทำเครื่องหมายว่าอ่านครบแล้ว",
    emptyTitle: "ยังไม่มีเรื่องที่อ่านจบ",
    emptyDescription: "เมื่อทำเครื่องหมายว่าอ่านจบ เรื่องจะย้ายมาเก็บในชั้นนี้",
  },
  history: {
    title: "ประวัติการอ่าน",
    description: "เรียงตามเวลาล่าสุด เพื่อหาเรื่องและตอนที่เปิดอ่านก่อนหน้านี้ให้เร็วที่สุด",
    emptyTitle: "ยังไม่มีประวัติการอ่าน",
    emptyDescription: "ประวัติจะเริ่มบันทึกเมื่อคุณเปิดอ่านตอนด้วยบัญชีนี้",
  },
};

const PRIMARY_NAV_ITEMS: { mode: Exclude<LibraryMode, "completed">; href: string; label: string }[] = [
  { mode: "reading", href: "/library", label: "กำลังอ่าน" },
  { mode: "following", href: "/library/following", label: "ติดตาม" },
  { mode: "bookmarks", href: "/library/bookmarks", label: "บันทึกไว้" },
  { mode: "history", href: "/history", label: "ประวัติ" },
];

const MODE_PATHS: Record<LibraryMode, string> = {
  reading: "/library",
  following: "/library/following",
  bookmarks: "/library/bookmarks",
  completed: "/library/completed",
  history: "/history",
};

export function LibraryView({
  mode,
  items,
  pagination,
}: {
  mode: LibraryMode;
  items: UserNovelListItem[];
  pagination: CollectionPagination;
}) {
  const copy = MODE_COPY[mode];
  return (
    <section className="space-y-6">
      <header className="border-b border-border pb-5">
        <p className="editorial-kicker">ชั้นหนังสือของฉัน</p>
        <h1 className="mt-1 text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{copy.description}</p>
      </header>

      <LibraryNav mode={mode} />

      {items.length ? (
        <>
          <div id="library-results" className="divide-y divide-border border-y border-border">
            {items.map((item) => (
              mode === "reading" || mode === "history"
                ? <ReadingRow key={item.novel.slug} item={item} mode={mode} />
                : <ShelfRow key={item.novel.slug} item={item} mode={mode} />
            ))}
          </div>
          <LibraryPagination pathname={MODE_PATHS[mode]} pagination={pagination} visibleItems={items.length} />
        </>
      ) : (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          icon={<ModeIcon mode={mode} />}
          action={<ButtonLink href="/novels"><Compass className="h-4 w-4" />สำรวจนิยาย</ButtonLink>}
        />
      )}
    </section>
  );
}

function LibraryPagination({
  pathname,
  pagination,
  visibleItems,
}: {
  pathname: string;
  pagination: CollectionPagination;
  visibleItems: number;
}) {
  const firstItem = (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = firstItem + visibleItems - 1;
  const pageHref = (page: number) => `${collectionPageHref(pathname, page)}#library-results`;

  return (
    <footer className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="tabular text-xs text-muted-foreground">
        แสดง {firstItem.toLocaleString("th-TH")}–{lastItem.toLocaleString("th-TH")} จาก {pagination.total.toLocaleString("th-TH")} เรื่อง
      </p>
      {pagination.totalPages > 1 ? (
        <nav aria-label="เปลี่ยนหน้ารายการในชั้นหนังสือ" className="flex items-center justify-between gap-2 sm:justify-end">
          {pagination.page > 1 ? (
            <ButtonLink href={pageHref(pagination.page - 1)} variant="outline" size="sm" rel="prev">
              หน้าก่อน
            </ButtonLink>
          ) : <span />}
          <span className="tabular inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground" aria-current="page">
            หน้า {pagination.page.toLocaleString("th-TH")} / {pagination.totalPages.toLocaleString("th-TH")}
          </span>
          {pagination.page < pagination.totalPages ? (
            <ButtonLink href={pageHref(pagination.page + 1)} variant="outline" size="sm" rel="next">
              หน้าถัดไป
            </ButtonLink>
          ) : <span />}
        </nav>
      ) : null}
    </footer>
  );
}

function LibraryNav({ mode }: { mode: LibraryMode }) {
  return (
    <div>
      <nav aria-label="ส่วนหลักในชั้นหนังสือ" className="flex max-w-full gap-1 overflow-x-auto border-b border-border">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <Link
            key={item.mode}
            href={item.href}
            aria-current={mode === item.mode ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold",
              mode === item.mode
                ? "border-[var(--brand-emphasis)] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex justify-end">
        <Link
          href="/library/completed"
          aria-current={mode === "completed" ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline",
            mode === "completed" ? "text-[var(--brand-emphasis)]" : "text-muted-foreground",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />ชั้นรอง · อ่านจบแล้ว
        </Link>
      </div>
    </div>
  );
}

function ReadingRow({ item, mode }: { item: UserNovelListItem; mode: "reading" | "history" }) {
  const chapter = item.chapter;
  const href = chapter
    ? `/novel/${item.novel.slug}/chapter/${chapter.number}`
    : `/novel/${item.novel.slug}`;
  const progress = Math.max(0, Math.min(100, Math.round(item.progressPercent ?? 0)));
  const timeLabel = item.lastReadAt ? relativeTime(item.lastReadAt) : null;

  return (
    <Link
      href={href}
      className="group grid grid-cols-[64px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="relative aspect-[2/3] w-16 overflow-hidden rounded-[5px] bg-muted sm:w-[72px]">
        <Image src={item.novel.cover} alt="" fill sizes="72px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="editorial-kicker">{mode === "history" ? "RECENTLY OPENED" : "CONTINUE READING"}</p>
        <h2 className="mt-0.5 truncate text-base font-semibold transition-colors group-hover:text-[var(--brand-emphasis)]">
          {item.novel.thaiTitle}
        </h2>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
          {chapter ? `ตอนที่ ${chapter.number}: ${chapter.title}` : "เปิดหน้ารายละเอียดเพื่อเลือกตอน"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden bg-muted">
            <div className="h-full bg-[var(--brand-primary)]" style={{ width: `${progress}%` }} />
          </div>
          <span className="tabular text-[11px] text-muted-foreground">{progress}%</span>
        </div>
        {timeLabel ? <p className="mt-1.5 text-xs text-muted-foreground">{mode === "history" ? "เปิดอ่าน" : "บันทึกล่าสุด"} {timeLabel}</p> : null}
      </div>
      <span className="col-start-2 inline-flex min-h-11 items-center gap-1 self-end text-sm font-semibold text-[var(--brand-emphasis)] sm:col-start-auto sm:self-center">
        อ่านต่อ <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function ShelfRow({ item, mode }: { item: UserNovelListItem; mode: "following" | "bookmarks" | "completed" }) {
  const timeLabel = item.lastReadAt ? relativeTime(item.lastReadAt) : null;
  const meta = mode === "following"
    ? timeLabel ? `ติดตาม ${timeLabel}` : "กำลังติดตามตอนใหม่"
    : mode === "bookmarks"
      ? "เก็บไว้เริ่มอ่านภายหลัง"
      : "ทำเครื่องหมายว่าอ่านจบแล้ว";

  return (
    <Link
      href={`/novel/${item.novel.slug}`}
      className="group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 py-4"
    >
      <div className="relative aspect-[2/3] w-14 overflow-hidden rounded-[5px] bg-muted">
        <Image src={item.novel.cover} alt="" fill sizes="56px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold transition-colors group-hover:text-[var(--brand-emphasis)]">
          {item.novel.thaiTitle}
        </h2>
        <p className="mt-1 truncate text-xs text-muted-foreground">{meta}</p>
        <p className="tabular mt-1 text-xs text-muted-foreground">
          {item.novel.latestChapter ? `ล่าสุด ตอนที่ ${item.novel.latestChapter.number.toLocaleString("th-TH")}` : `${item.novel.chapters.toLocaleString("th-TH")} ตอน`}
        </p>
      </div>
      <span className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[var(--brand-emphasis)]">
        เปิดเรื่อง <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return new Date(value).toLocaleDateString("th-TH", { dateStyle: "medium" });
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const relative = new Intl.RelativeTimeFormat("th-TH", { numeric: "auto" });
  if (elapsed < hour) return relative.format(-Math.max(1, Math.round(elapsed / minute)), "minute");
  if (elapsed < day) return relative.format(-Math.round(elapsed / hour), "hour");
  if (elapsed < 7 * day) return relative.format(-Math.round(elapsed / day), "day");
  return new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function ModeIcon({ mode }: { mode: LibraryMode }) {
  const Icon = mode === "reading"
    ? LibraryBig
    : mode === "following"
      ? Heart
      : mode === "bookmarks"
        ? Bookmark
        : mode === "completed"
          ? CheckCircle2
          : Clock3;
  return <Icon className="h-7 w-7" />;
}
