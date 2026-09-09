import Image from "next/image";
import Link from "next/link";
import { ListOrdered, Star } from "lucide-react";
import { ViewTransition } from "react";

import { RatingForm } from "@/components/interactive/rating-form";
import { NovelResumeActions } from "@/components/reader/novel-resume-actions";
import { EmptyState } from "@/components/ui/section";
import { formatNumber } from "@/lib/utils";
import type { UserNovelState } from "@/services/user-service";
import type { ChapterSummary, Novel, Review } from "@/types/novel";

function statusLabel(status: Novel["status"]) {
  if (status === "completed") return "จบแล้ว";
  if (status === "hiatus") return "พักการอัปเดต";
  return "กำลังอัปเดต";
}

function formatChapterNumber(value: number) {
  return value.toLocaleString("th-TH", {
    maximumFractionDigits: 3,
    useGrouping: false,
  });
}

export function NovelHero({
  novel,
  startHref,
  startLabel,
  userState,
}: {
  novel: Novel;
  startHref: string;
  startLabel: string;
  userState?: UserNovelState;
}) {
  return (
    <header className="relative isolate overflow-hidden rounded-(--r-lg) bg-surface px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={novel.cover}
          alt=""
          fill
          sizes="384px"
          className="scale-125 object-cover object-center opacity-40 blur-3xl saturate-150 dark:opacity-50"
        />
        <div className="absolute inset-0 bg-linear-to-r from-surface/70 via-surface/88 to-surface/95" />
        <div className="absolute inset-0 bg-linear-to-b from-surface/25 via-transparent to-surface/90" />
      </div>

      <div className="relative grid gap-5 md:grid-cols-[200px_minmax(0,1fr)] md:items-center md:gap-x-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-x-10">
        <div className="min-w-0 text-center md:col-start-2 md:row-start-1 md:text-left">
          <span className="inline-flex min-h-7 items-center border-l-2 border-[var(--brand-emphasis)] pl-2 text-xs font-semibold">
            {statusLabel(novel.status)}
          </span>
          <h1 className="mt-3 text-balance text-h1 font-semibold leading-[1.25] sm:text-4xl lg:text-5xl">
            {novel.thaiTitle}
          </h1>
        </div>

        <div className="mx-auto w-[164px] md:col-start-1 md:row-span-2 md:row-start-1 md:w-full">
          <ViewTransition name={`cover-${novel.slug}`} share="morph" default="none">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[6px] border border-border bg-muted shadow-[var(--sh-2)]">
              <Image
                src={novel.cover}
                alt={`ปกนิยาย ${novel.thaiTitle}`}
                fill
                preload
                sizes="(max-width: 767px) 164px, 220px"
                className="object-cover"
              />
            </div>
          </ViewTransition>
        </div>

        <div className="min-w-0 text-center md:col-start-2 md:row-start-2 md:text-left">
          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            {novel.genres.map((genre) => (
              <Link
                key={genre}
                href={`/genre/${genre}`}
                className="inline-flex min-h-9 items-center rounded-full border border-border bg-card/80 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)]"
              >
                {novel.genreNames?.[genre] ?? genre}
              </Link>
            ))}
          </div>

          <NovelResumeActions
            slug={novel.slug}
            startHref={startHref}
            startLabel={startLabel}
            serverProgress={userState?.progress}
            libraryStatus={userState?.libraryStatus}
            bookmarkCount={novel.bookmarkCount}
          />
        </div>
      </div>
    </header>
  );
}

export function NovelSignals({ novel }: { novel: Novel }) {
  return (
    <section aria-label="ข้อมูลการอ่านของเรื่อง" className="mt-4 overflow-hidden rounded-(--r-md) bg-surface-subtle">
      <dl className="grid grid-cols-3 divide-x divide-border px-2 py-4 sm:px-4 sm:py-5">
        <Signal label="ยอดอ่าน" value={formatNumber(novel.views)} />
        <Signal label="จำนวนตอน" value={formatNumber(novel.chapters)} />
        <Signal label="รีวิว" value={formatNumber(novel.reviewCount ?? 0)} />
      </dl>
    </section>
  );
}

export function NovelSynopsis({ novel }: { novel: Novel }) {
  return (
    <section aria-labelledby="novel-synopsis-title">
      <h2 id="novel-synopsis-title" className="text-h2 font-semibold">เรื่องย่อ</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
        {novel.synopsis}
      </p>
    </section>
  );
}

function chapterRangeLabel(chapters: ChapterSummary[]) {
  if (!chapters.length) return "";
  const numbers = chapters.map((chapter) => chapter.number);
  const start = Math.min(...numbers);
  const end = Math.max(...numbers);
  return start === end
    ? `ตอนที่ ${formatChapterNumber(start)}`
    : `ตอนที่ ${formatChapterNumber(start)} – ${formatChapterNumber(end)}`;
}

function ChapterSection({
  slug,
  title,
  chapters,
}: {
  slug: string;
  title: string;
  chapters: ChapterSummary[];
}) {
  return (
    <section className="overflow-hidden rounded-(--r-md) border border-border bg-card" aria-label={title}>
      <h3 className="bg-surface-subtle px-4 py-3 text-sm font-semibold sm:px-5">{title}</h3>
      <ol className="divide-y divide-border">
        {chapters.map((chapter) => (
          <li key={chapter.id ?? chapter.number}>
            <Link
              href={`/novel/${slug}/chapter/${chapter.number}`}
              className="group grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle sm:px-5"
            >
              <span className="tabular text-xs font-semibold text-muted-foreground">
                {formatChapterNumber(chapter.number)}
              </span>
              <span className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-[var(--brand-emphasis)]">
                {chapter.title}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ChapterPreview({
  slug,
  firstChapters,
  latestChapters,
  chapterCount,
}: {
  slug: string;
  firstChapters: ChapterSummary[];
  latestChapters: ChapterSummary[];
  chapterCount: number;
}) {
  const first = [...firstChapters].sort((left, right) => left.number - right.number);
  const firstKeys = new Set(first.map((chapter) => chapter.id ?? chapter.number));
  const latest = [...latestChapters]
    .filter((chapter) => !firstKeys.has(chapter.id ?? chapter.number))
    .sort((left, right) => right.number - left.number);
  const hasChapters = first.length > 0 || latest.length > 0;
  const isSingleSection = latest.length === 0;

  return (
    <section aria-labelledby="chapter-preview-title">
      <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ListOrdered className="h-5 w-5 shrink-0 text-[var(--brand-light-on-light)]" aria-hidden />
          <h2 id="chapter-preview-title" className="text-h2 font-semibold">สารบัญ</h2>
          <span className="text-sm text-muted-foreground">{formatNumber(chapterCount)} ตอน</span>
        </div>
        <Link
          href={`/novel/${slug}/chapters`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
        >
          ดูทั้งหมด
        </Link>
      </div>

      {hasChapters ? (
        <div className="grid gap-3 md:grid-cols-2">
          <ChapterSection
            slug={slug}
            title={isSingleSection ? "ตอนทั้งหมด" : `ช่วงตอนแรก · ${chapterRangeLabel(first)}`}
            chapters={first}
          />
          {latest.length ? (
            <ChapterSection
              slug={slug}
              title={`ช่วงตอนล่าสุด · ${chapterRangeLabel(latest)}`}
              chapters={latest}
            />
          ) : null}
        </div>
      ) : (
        <EmptyState title="ยังไม่มีตอนที่เผยแพร่" description="กลับมาดูใหม่เมื่อมีตอนแรก" />
      )}
    </section>
  );
}

export function NovelCommunity({
  novel,
  userState,
  reviews,
}: {
  novel: Novel;
  userState?: UserNovelState;
  reviews: Review[];
}) {
  const ratingCount = novel.ratingCount ?? 0;
  const hasRating = ratingCount > 0;

  return (
    <section aria-labelledby="reader-reviews-title">
      <h2 id="reader-reviews-title" className="text-h2 font-semibold">รีวิวจากนักอ่าน</h2>
      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <strong className="tabular text-5xl font-semibold leading-none">
          {hasRating ? novel.rating.toFixed(1) : "—"}
        </strong>
        <div>
          <div className="flex gap-0.5" aria-label={hasRating ? `คะแนน ${novel.rating.toFixed(1)} จาก 5` : "ยังไม่มีคะแนน"}>
            {[1, 2, 3, 4, 5].map((score) => (
              <Star
                key={score}
                aria-hidden
                className={`h-5 w-5 ${hasRating && score <= Math.round(novel.rating) ? "fill-amber-400 text-amber-400" : "text-border"}`}
              />
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatNumber(ratingCount)} คะแนน · {formatNumber(novel.reviewCount ?? reviews.length)} รีวิว</p>
        </div>
      </div>

      <div className="mt-4">
        <RatingForm
          slug={novel.slug}
          isAuthenticated={Boolean(userState)}
          initialRating={userState?.rating}
          compact
        />
      </div>

      {reviews.length ? (
        <div className="mt-4 divide-y divide-border border-t border-border">
          {reviews.map((review) => (
            <ReaderReview key={review.id} review={review} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReaderReview({ review }: { review: Review }) {
  const content = (
    <>
      {review.title ? <h3 className="mt-3 font-semibold">{review.title}</h3> : null}
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{review.content}</p>
    </>
  );

  return (
    <article className="py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-semibold">{review.authorName}</p>
        {review.rating ? (
          <span className="tabular flex shrink-0 items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-[var(--brand-emphasis)] text-[var(--brand-emphasis)]" aria-hidden />
            {review.rating}
          </span>
        ) : null}
      </div>
      {review.isSpoiler ? (
        <details className="mt-3 border-l-2 border-[var(--brand-emphasis)] bg-muted/40 px-4 py-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
            รีวิวนี้มีเนื้อหาสปอยล์ — เลือกเพื่ออ่าน
          </summary>
          {content}
        </details>
      ) : content}
      <time dateTime={review.createdAt} className="mt-3 block text-xs text-muted-foreground">
        {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(review.createdAt))}
      </time>
    </article>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 text-center sm:px-4">
      <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd className="tabular mt-1 truncate text-xl font-semibold sm:text-2xl">{value}</dd>
    </div>
  );
}
