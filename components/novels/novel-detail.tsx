import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { ViewTransition } from "react";

import { RatingForm } from "@/components/interactive/rating-form";
import { NovelResumeActions } from "@/components/reader/novel-resume-actions";
import { formatNumber } from "@/lib/utils";
import type { UserNovelState } from "@/services/user-service";
import type { Novel, Review } from "@/types/novel";

function statusLabel(status: Novel["status"]) {
  if (status === "completed") return "จบแล้ว";
  if (status === "hiatus") return "พักการอัปเดต";
  return "กำลังอัปเดต";
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
    <header className="relative overflow-hidden rounded-(--r-lg) bg-surface shadow-[var(--sh-1)]">
      <div
        className={novel.hasBanner
          ? "relative aspect-[8/3] overflow-hidden bg-black/25"
          : "relative h-[210px] overflow-hidden bg-black/25 sm:h-[280px] lg:h-[300px]"}
      >
        <Image
          src={novel.backdrop}
          alt=""
          fill
          preload
          sizes="(max-width: 1535px) 100vw, 1536px"
          className={novel.hasBanner
            ? "object-cover object-center saturate-110"
            : "scale-110 object-cover object-center blur-2xl saturate-125"}
        />
        <div aria-hidden className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-b from-transparent via-surface/40 to-surface sm:h-16 lg:h-20" />
      </div>

      <div className="relative grid gap-x-8 px-4 pb-6 sm:px-6 md:grid-cols-[190px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-x-8 lg:px-8 lg:pb-7">
        <div className="mx-auto -mt-20 w-[160px] md:col-start-1 md:row-span-3 md:row-start-1 md:-mt-24 md:w-full">
          <ViewTransition name={`cover-${novel.slug}`} share="morph" default="none">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[10px] border-4 border-surface bg-muted shadow-[0_20px_48px_-16px_rgba(0,0,0,0.75)] ring-1 ring-border/70">
              <Image
                src={novel.cover}
                alt={`ปกนิยาย ${novel.thaiTitle}`}
                fill
                sizes="(max-width: 767px) 160px, (max-width: 1023px) 190px, 200px"
                className="object-cover"
              />
            </div>
          </ViewTransition>
        </div>

        <div className="min-w-0 pt-4 text-center md:col-start-2 md:row-start-1 md:pt-5 md:text-left lg:pt-6">
          <span className="inline-flex min-h-7 items-center border-l-2 border-[var(--brand-emphasis)] pl-2 text-xs font-semibold">
            {statusLabel(novel.status)}
          </span>
          <h1 className="mt-2 max-w-5xl text-balance text-h1 font-semibold leading-[1.2] sm:text-4xl lg:text-[2.75rem]">
            {novel.thaiTitle}
          </h1>
        </div>

        <div className="min-w-0 pt-4 text-center md:col-start-2 md:row-start-2 md:text-left">
          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            {novel.genres.map((genre) => (
              <Link
                key={genre}
                href={`/genre/${genre}`}
                className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)]"
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

        <section
          aria-label="ข้อมูลการอ่านของเรื่อง"
          className="mt-5 overflow-hidden rounded-(--r-md) bg-surface-subtle md:col-start-2 md:row-start-3 md:mt-4 md:max-w-2xl"
        >
          <dl className="grid grid-cols-3 divide-x divide-border px-2 py-2.5 sm:px-3 sm:py-3">
            <Signal label="ยอดอ่าน" value={formatNumber(novel.views)} />
            <Signal label="จำนวนตอน" value={formatNumber(novel.chapters)} />
            <Signal label="รีวิว" value={formatNumber(novel.reviewCount ?? 0)} />
          </dl>
        </section>
      </div>
    </header>
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
