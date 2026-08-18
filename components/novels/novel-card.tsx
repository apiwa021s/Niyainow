import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Eye, Minus, Sparkles, Star } from "lucide-react";

import { BookmarkToggle } from "@/components/interactive/novel-actions";
import { cn, formatNumber } from "@/lib/utils";
import type { RankingMovement } from "@/services/novel-service";
import type { Novel } from "@/types/novel";

const statusLabel: Record<Novel["status"], string> = {
  ongoing: "กำลังแปล",
  completed: "จบแล้ว",
  hiatus: "พักการแปล",
};

const genreNameOf = (novel: Novel, slug?: string) =>
  slug ? (novel.genreNames?.[slug] ?? slug) : "";

function HighlightedTitle({ text, query }: { text: string; query?: string }) {
  const needle = query?.trim();
  if (!needle) return <>{text}</>;
  const index = text.toLocaleLowerCase("th").indexOf(needle.toLocaleLowerCase("th"));
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-[var(--brand-primary)]/15 text-inherit">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

function CoverBadge({ novel }: { novel: Novel }) {
  const label = novel.isNew
    ? "ใหม่"
    : novel.featured
      ? "คัดสรร"
      : novel.status === "completed"
        ? "จบแล้ว"
        : null;
  if (!label) return null;
  return (
    <span className="rounded-[4px] bg-black/80 px-2 py-1 text-[11px] font-semibold text-white">
      {label}
    </span>
  );
}

function GenreChip({ label }: { label: string }) {
  return (
    <span className="rounded-[4px] border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

/**
 * Dense grid tile — the workhorse of every discovery grid.
 *
 * The cover is the only colour on the page (brief §3.2), so the label sits on
 * the artwork behind a gradient rather than stealing a row of neutral space
 * below it. Four meta slots maximum (brief §5.4): title, genre, one number,
 * one status badge.
 */
export function NovelTile({ novel, priority = false }: { novel: Novel; priority?: boolean }) {
  const genre = genreNameOf(novel, novel.genres[0]);
  return (
    <article className="group relative">
      {/*
       * The bookmark control is desktop-only. Its 44px tap target covers 40% of
       * a 104px tile on a phone and hides the artwork the grid exists to show;
       * on mobile the same action lives on the novel page one tap away.
       */}
      <div className="absolute right-1.5 top-1.5 z-20 hidden opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 lg:block">
        <BookmarkToggle slug={novel.slug} />
      </div>
      <Link href={`/novel/${novel.slug}`} className="block">
        <div className="cover-tile">
          <Image
            src={novel.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 31vw, (max-width: 1024px) 20vw, 15vw"
            priority={priority}
            className="object-cover"
          />
          <div className="absolute left-1.5 top-1.5 z-20 flex flex-col items-start gap-1">
            <CoverBadge novel={novel} />
            {(novel.ratingCount ?? 0) > 0 ? (
              <span className="tabular inline-flex items-center gap-1 rounded-[4px] bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                <Star className="h-3 w-3 fill-[var(--accent-base)] text-[var(--accent-base)]" aria-hidden />
                {novel.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <div className="absolute inset-x-0 bottom-0 z-20 p-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-[1.4] text-white drop-shadow-sm">
              {novel.thaiTitle}
            </h3>
            {/* A 104px tile has room for one fact. Squeezing the genre in
                beside it clipped both to three characters, so the genre only
                appears once the tile is wide enough to render it whole. */}
            <p className="tabular mt-0.5 flex items-center gap-1.5 text-xs text-white/75">
              {genre ? <span className="hidden truncate sm:inline">{genre}</span> : null}
              {genre ? <span aria-hidden className="hidden sm:inline">·</span> : null}
              <span className="shrink-0">{novel.chapters.toLocaleString("th-TH")} ตอน</span>
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** A single, whole-card link that resumes the exact chapter supplied by the caller. */
export function ContinueReadingCard({
  novel,
  href,
  chapterLabel,
  progress = 0,
  meta,
}: {
  novel: Novel;
  href: string;
  chapterLabel: string;
  progress?: number;
  meta?: string;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <Link
      href={href}
      className="group grid w-[286px] shrink-0 grid-cols-[72px_1fr] gap-3 rounded-[8px] border border-border bg-card p-3 transition-colors hover:border-[var(--brand-emphasis)]/50 sm:w-[340px]"
    >
      <div className="relative aspect-[2/3] w-[72px] overflow-hidden rounded-[5px] bg-muted">
        <Image src={novel.cover} alt="" fill sizes="72px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <p className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-[var(--brand-emphasis)]">
          {novel.thaiTitle}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{chapterLabel}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[var(--brand-primary)]" style={{ width: `${safeProgress}%` }} />
          </div>
          <span className="tabular text-[11px] text-muted-foreground">{safeProgress}%</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {meta ? <span className="truncate text-[11px] text-muted-foreground">{meta}</span> : <span />}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-emphasis)]">
            <BookOpen className="h-3.5 w-3.5" /> อ่านต่อ
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Information-rich result card for search. */
export function SearchNovelCard({ novel, highlight }: { novel: Novel; highlight?: string }) {
  const originalTitle = novel.title !== novel.thaiTitle ? novel.title : null;
  return (
    <Link
      href={`/novel/${novel.slug}`}
      className="group grid grid-cols-[88px_1fr] gap-4 border-b border-border py-4 sm:grid-cols-[104px_1fr]"
    >
      <div className="relative aspect-[2/3] w-[88px] overflow-hidden rounded-[6px] border border-border bg-muted sm:w-[104px]">
        <Image src={novel.cover} alt="" fill sizes="104px" className="object-cover" />
      </div>
      <div className="min-w-0 self-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--brand-emphasis)]">{statusLabel[novel.status]}</span>
          {novel.genres.slice(0, 2).map((slug) => (
            <GenreChip key={slug} label={genreNameOf(novel, slug)} />
          ))}
        </div>
        <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug transition-colors group-hover:text-[var(--brand-emphasis)]">
          <HighlightedTitle text={novel.thaiTitle} query={highlight} />
        </h3>
        {originalTitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{originalTitle}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">ผู้แต่ง {novel.author}</p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{novel.synopsis}</p>
        <div className="tabular mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {(novel.ratingCount ?? 0) > 0 ? (
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[var(--brand-emphasis)] text-[var(--brand-emphasis)]" />{novel.rating.toFixed(1)}</span>
          ) : <span>ยังไม่มีคะแนน</span>}
          <span>{novel.chapters.toLocaleString("th-TH")} ตอน</span>
          <span>{formatNumber(novel.views)} ครั้ง</span>
        </div>
      </div>
    </Link>
  );
}

/** Dense card for narrow/mobile lists. */
export function CompactNovelCard({ novel, meta }: { novel: Novel; meta?: string }) {
  return (
    <Link href={`/novel/${novel.slug}`} className="group flex min-w-0 items-center gap-3 border-b border-border py-3">
      <div className="relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-[4px] bg-muted">
        <Image src={novel.cover} alt="" fill sizes="44px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold group-hover:text-[var(--brand-emphasis)]">{novel.thaiTitle}</p>
        <p className="tabular mt-1 truncate text-xs text-muted-foreground">
          {meta ?? `${genreNameOf(novel, novel.genres[0])} · ${novel.chapters.toLocaleString("th-TH")} ตอน`}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Ranking variant with rank as the dominant signal. */
export function RankingNovelCard({ novel, rank, movement }: { novel: Novel; rank: number; movement?: RankingMovement }) {
  return (
    <Link
      href={`/novel/${novel.slug}`}
      className="group grid grid-cols-[48px_44px_1fr_auto] items-center gap-3 border-b border-border py-3"
    >
      <span className={cn("tabular text-center font-mono text-xl", rank <= 3 ? "text-[var(--brand-emphasis)]" : "text-muted-foreground")}>
        {String(rank).padStart(2, "0")}
      </span>
      <div className="relative aspect-[2/3] w-11 overflow-hidden rounded-[4px] bg-muted">
        <Image src={novel.cover} alt="" fill sizes="44px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--brand-emphasis)]">{novel.thaiTitle}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{genreNameOf(novel, novel.genres[0])} · {novel.chapters.toLocaleString("th-TH")} ตอน</p>
        {movement ? <MovementLabel movement={movement} className="mt-1 sm:hidden" /> : null}
      </div>
      {movement ? <MovementLabel movement={movement} className="hidden sm:inline-flex" /> : (
        <span className="tabular hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Eye className="h-3.5 w-3.5" /> {formatNumber(novel.views)}
        </span>
      )}
    </Link>
  );
}

export function NovelListItem({
  novel,
  href,
  chapterLabel,
  progress,
  meta,
  action,
  highlight,
}: {
  novel: Novel;
  href?: string;
  chapterLabel?: string;
  progress?: number;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  highlight?: string;
}) {
  const safeProgress = typeof progress === "number" ? Math.max(0, Math.min(100, Math.round(progress))) : undefined;
  return (
    <Link href={href ?? `/novel/${novel.slug}`} className="group flex gap-3 rounded-[8px] border border-border bg-card p-3 transition-colors hover:border-[var(--brand-emphasis)]/45">
      <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-[5px] bg-muted">
        <Image src={novel.cover} alt="" fill sizes="64px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--brand-emphasis)]">
          <HighlightedTitle text={novel.thaiTitle} query={highlight} />
        </h3>
        <p className="tabular line-clamp-1 text-xs text-muted-foreground">
          {chapterLabel ?? `${novel.chapters.toLocaleString("th-TH")} ตอน`}{meta ? <> · {meta}</> : null}
        </p>
        {safeProgress !== undefined ? (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-[var(--brand-primary)]" style={{ width: `${safeProgress}%` }} /></div>
            <span className="tabular text-[11px] text-muted-foreground">{safeProgress}%</span>
          </div>
        ) : null}
        {action ? <div className="mt-1.5">{action}</div> : null}
      </div>
    </Link>
  );
}

export function SimilarNovelCard({ novel, href, highlight }: { novel: Novel; href?: string; highlight?: string }) {
  return <NovelListItem novel={novel} href={href} meta={statusLabel[novel.status]} highlight={highlight} />;
}

export function EditorialRecommendationCard({ novel }: { novel: Novel }) {
  return (
    <Link href={`/novel/${novel.slug}`} className="group grid w-[310px] shrink-0 grid-cols-[84px_1fr] gap-4 rounded-[8px] bg-card/70 p-4 transition-colors hover:bg-muted/55 sm:w-[390px] sm:grid-cols-[96px_1fr]">
      <div className="relative aspect-[2/3] overflow-hidden rounded-[5px] bg-muted">
        <Image src={novel.cover} alt="" fill sizes="96px" className="object-cover" />
      </div>
      <div className="min-w-0 self-center">
        <p className="text-xs font-semibold tracking-[.14em] text-[var(--brand-emphasis)]">คัดจากคะแนนผู้อ่าน</p>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-[1.5] group-hover:text-[var(--brand-emphasis)]">{novel.thaiTitle}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-[1.7] text-muted-foreground">{novel.synopsis}</p>
        <div className="tabular mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          {(novel.ratingCount ?? 0) > 0 ? <><Star className="h-3 w-3 fill-[var(--brand-emphasis)] text-[var(--brand-emphasis)]" />{novel.rating.toFixed(1)}</> : <span>ยังไม่มีคะแนน</span>}
          <span>{novel.chapters.toLocaleString("th-TH")} ตอน</span>
        </div>
      </div>
    </Link>
  );
}

export function RankingCard({ novel, rank, movement }: { novel: Novel; rank: number; movement?: RankingMovement }) {
  return (
    <article className="group flex w-[196px] shrink-0 items-end gap-1 sm:w-[220px]">
      <span className={cn("-mr-2 select-none font-mono text-[56px] font-light leading-[0.8] tracking-[-.12em]", rank <= 3 ? "text-[var(--brand-emphasis)]" : "text-muted-foreground/40")}>
        <span className="sr-only">อันดับ {rank}</span>
        <span aria-hidden>{String(rank).padStart(2, "0")}</span>
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/novel/${novel.slug}`} className="block">
          <div className="relative aspect-[2/3] overflow-hidden rounded-[6px] border border-border bg-muted"><Image src={novel.cover} alt="" fill sizes="150px" className="object-cover" /></div>
          <h3 className="mt-2 truncate text-sm font-semibold">{novel.thaiTitle}</h3>
          <p className="tabular mt-1 truncate text-[11px] text-muted-foreground">{genreNameOf(novel, novel.genres[0])} · {novel.chapters.toLocaleString("th-TH")} ตอน</p>
          {movement ? <MovementLabel movement={movement} className="mt-1" /> : null}
        </Link>
      </div>
    </article>
  );
}

function MovementLabel({ movement, className }: { movement: RankingMovement; className?: string }) {
  const Icon = movement.direction === "up"
    ? ArrowUp
    : movement.direction === "down"
      ? ArrowDown
      : movement.direction === "new"
        ? Sparkles
        : Minus;
  const label = movement.direction === "up"
    ? `ขึ้น ${movement.places ?? 0} อันดับ`
    : movement.direction === "down"
      ? `ลง ${movement.places ?? 0} อันดับ`
      : movement.direction === "new"
        ? "เข้าอันดับใหม่"
        : "อันดับคงที่";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground", movement.direction === "up" && "text-[var(--brand-emphasis)]", className)}>
      <Icon className="h-3 w-3" aria-hidden />{label}
    </span>
  );
}
