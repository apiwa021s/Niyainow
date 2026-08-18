import Image from "next/image";
import Link from "next/link";
import { BookOpen, ListOrdered, Star } from "lucide-react";

import {
  CompleteButton,
} from "@/components/interactive/novel-actions";
import { RatingReviewForm } from "@/components/interactive/rating-review-form";
import { SimilarNovelCard } from "@/components/novels/novel-card";
import { NovelResumeActions } from "@/components/reader/novel-resume-actions";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/section";
import { formatNumber } from "@/lib/utils";
import type { UserNovelState } from "@/services/user-service";
import type { ChapterSummary, Novel, Review } from "@/types/novel";

type NovelStatusMeta = {
  label: string;
  detail: string;
};

function statusMeta(status: Novel["status"]): NovelStatusMeta {
  if (status === "completed") {
    return { label: "จบแล้ว", detail: "เผยแพร่ครบทุกตอนที่มีในคลัง" };
  }
  if (status === "hiatus") {
    return { label: "พักการแปล", detail: "ยังไม่มีตอนใหม่ในช่วงนี้" };
  }
  return { label: "กำลังแปล", detail: "ติดตามเพื่อไม่พลาดตอนใหม่" };
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
  const status = statusMeta(novel.status);

  return (
    <header className="relative isolate overflow-hidden rounded-(--r-lg) bg-surface px-3 py-5 sm:px-5 sm:py-7 lg:px-6 lg:py-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={novel.cover}
          alt=""
          fill
          sizes="384px"
          className="scale-125 object-cover object-center opacity-45 blur-3xl saturate-150 dark:opacity-55"
        />
        <div className="absolute inset-0 bg-linear-to-r from-surface/55 via-surface/82 to-surface/95" />
        <div className="absolute inset-0 bg-linear-to-b from-surface/15 via-transparent to-surface/85" />
      </div>

      <div className="relative grid gap-7 md:grid-cols-[200px_minmax(0,1fr)] md:items-start md:gap-8 xl:grid-cols-[228px_minmax(0,1fr)_248px] xl:gap-10">
        <div className="mx-auto w-[156px] sm:w-[176px] md:mx-0 md:w-full">
          <div className="relative aspect-[2/3] overflow-hidden rounded-[6px] border border-border bg-muted shadow-[var(--sh-2)]">
            <Image
              src={novel.cover}
              alt={`ปกนิยาย ${novel.thaiTitle}`}
              fill
              preload
              sizes="(max-width: 767px) 176px, 228px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="min-w-0 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 md:justify-start">
            <span className="inline-flex min-h-7 items-center border-l-2 border-[var(--brand-emphasis)] pl-2 text-xs font-semibold text-foreground">
              {status.label}
            </span>
            {novel.genres.slice(0, 3).map((genre) => (
              <Link
                key={genre}
                href={`/genre/${genre}`}
                className="inline-flex min-h-11 items-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-[var(--brand-emphasis)] hover:underline"
              >
                {novel.genreNames?.[genre] ?? genre}
              </Link>
            ))}
          </div>

          <p className="editorial-kicker mt-4">NOVEL / เรื่องอ่าน</p>
          <h1 className="mt-1 text-balance text-h1 font-semibold leading-[1.25] sm:text-4xl xl:text-5xl">
            {novel.thaiTitle}
          </h1>
          {novel.title !== novel.thaiTitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{novel.title}</p>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">
            ผู้เขียน <span className="font-medium text-foreground">{novel.author}</span>
            {novel.translator ? (
              <> · ผู้แปล <span className="font-medium text-foreground">{novel.translator}</span></>
            ) : null}
          </p>

          <p className="mt-4 line-clamp-4 text-left text-sm leading-[1.9] text-muted-foreground sm:text-base">
            {novel.synopsis}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground md:justify-start">
            <span><strong className="tabular text-base text-foreground">{novel.chapters.toLocaleString("th-TH")}</strong> ตอน</span>
            <span>{novel.latestChapter ? `ล่าสุด ตอนที่ ${novel.latestChapter.number.toLocaleString("th-TH")}` : "ยังไม่มีตอนเผยแพร่"}</span>
            <span>{status.detail}</span>
          </div>

          <NovelResumeActions
            slug={novel.slug}
            title={novel.thaiTitle}
            startHref={startHref}
            startLabel={startLabel}
            serverProgress={userState?.progress}
            followed={userState?.followed}
            libraryStatus={userState?.libraryStatus}
            bookmarkCount={novel.bookmarkCount}
          />
        </div>

        <aside className="hidden rounded-(--r-md) bg-surface-subtle p-4 xl:block" aria-label="ข้อมูลฉบับและทางลัด">
          <p className="editorial-kicker">READING INDEX</p>
          <p className="tabular mt-3 text-4xl font-semibold">{novel.chapters.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-xs text-muted-foreground">ตอนที่เผยแพร่ในคลัง</p>
          <dl className="mt-5 grid gap-1 text-sm">
            <InfoRow label="สถานะ" value={status.label} />
            <InfoRow label="อัปเดต" value={novel.updatedAt} />
            <InfoRow label="ตอนล่าสุด" value={novel.latestChapter ? `ตอนที่ ${novel.latestChapter.number}` : "—"} />
          </dl>
          <ButtonLink href={`/novel/${novel.slug}/chapters`} variant="outline" className="mt-5 w-full">
            <ListOrdered className="h-4 w-4" />
            เปิดสารบัญ
          </ButtonLink>
        </aside>
      </div>
    </header>
  );
}

export function NovelSignals({ novel }: { novel: Novel }) {
  return (
    <section aria-label="ข้อมูลการอ่านของเรื่อง" className="grid gap-4 rounded-(--r-md) bg-surface-subtle px-3 py-3 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-7 sm:px-4">
      <div>
        <p className="text-xs text-muted-foreground">จำนวนตอน</p>
        <p className="tabular mt-0.5 text-2xl font-semibold">{novel.chapters.toLocaleString("th-TH")}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:flex sm:flex-wrap sm:gap-x-7">
        <Signal label="คะแนนผู้อ่าน" value={(novel.ratingCount ?? 0) > 0 ? `${novel.rating.toFixed(1)} / 5` : "ยังไม่มีคะแนน"} />
        <Signal label="ยอดอ่าน" value={`${formatNumber(novel.views)} ครั้ง`} />
        <Signal label="อยู่ในคลัง" value={`${formatNumber(novel.bookmarkCount ?? 0)} คน`} />
        <Signal label="การเข้าถึง" value={novel.hasPaidChapters ? "มีตอนจำกัดการเข้าถึง" : "อ่านตอนสาธารณะได้"} />
      </dl>
    </section>
  );
}

export function ChapterPreview({ slug, chapters }: { slug: string; chapters: ChapterSummary[] }) {
  return (
    <section aria-labelledby="latest-chapters-title">
      <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ListOrdered className="h-4 w-4 shrink-0 text-[var(--brand-light-on-light)]" aria-hidden />
          <h2 id="latest-chapters-title" className="truncate text-h2 font-semibold">ตอนล่าสุด</h2>
        </div>
        <Link href={`/novel/${slug}/chapters`} className="-my-3 inline-flex min-h-11 shrink-0 items-center py-3 text-sm font-semibold text-(--text-secondary) hover:text-[var(--brand-emphasis)]">
          ดูสารบัญทั้งหมด
        </Link>
      </div>
      {chapters.length ? (
        <ol className="grid gap-1">
          {chapters.map((chapter) => (
            <li key={chapter.id ?? chapter.number}>
              <Link
                href={`/novel/${slug}/chapter/${chapter.number}`}
                className="group block rounded-[6px] px-3 py-3 transition-colors hover:bg-surface-subtle"
                aria-label={`ตอนที่ ${chapter.number} ${chapter.title}`}
              >
                <span className="line-clamp-1 font-medium transition-colors group-hover:text-[var(--brand-emphasis)]">
                  {chapter.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="ยังไม่มีตอนที่เผยแพร่" description="ติดตามเรื่องนี้ไว้ แล้วกลับมาเมื่อผู้ดูแลเผยแพร่ตอนแรก" />
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
  return (
    <>
      <section aria-labelledby="rate-review-title">
        <h2 id="rate-review-title" className="sr-only">ให้คะแนนและเขียนรีวิว</h2>
        <RatingReviewForm
          slug={novel.slug}
          isAuthenticated={Boolean(userState)}
          initialRating={userState?.rating}
          initialReview={userState?.review ? {
            title: userState.review.title,
            body: userState.review.body,
            isSpoiler: userState.review.isSpoiler,
            status: userState.review.status,
          } : null}
        />
      </section>

      {reviews.length ? (
        <section aria-labelledby="reader-reviews-title">
          <div className="mb-3">
            <h2 id="reader-reviews-title" className="text-h2 font-semibold">รีวิวจากนักอ่าน</h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatNumber(novel.reviewCount ?? reviews.length)} รีวิวจากข้อมูลที่เผยแพร่จริง</p>
          </div>
          <div className="grid gap-3">
            {reviews.map((review) => (
              <ReaderReview key={review.id} review={review} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

export function NovelMetaRail({ novel, userState }: { novel: Novel; userState?: UserNovelState }) {
  const status = statusMeta(novel.status);
  return (
    <aside className="space-y-6 lg:pl-7" aria-label="ข้อมูลเพิ่มเติมของนิยาย">
      {novel.tags.length ? (
        <section>
          <p className="editorial-kicker">STORY THREADS</p>
          <h2 className="mt-1 text-sm font-semibold">แท็กของเรื่อง</h2>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
            {novel.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${tag}`}
                className="inline-flex min-h-11 items-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-[var(--brand-emphasis)] hover:underline"
              >
                #{novel.tagNames?.[tag] ?? tag}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <p className="editorial-kicker">EDITION NOTE</p>
        <h2 className="mt-1 text-sm font-semibold">ข้อมูลฉบับ</h2>
        <dl className="mt-3 grid gap-1">
          <InfoRow label="ผู้เขียน" value={novel.author} />
          {novel.translator ? <InfoRow label="ผู้แปล" value={novel.translator} /> : null}
          <InfoRow label="สถานะ" value={status.label} />
          <InfoRow label="อัปเดตล่าสุด" value={novel.updatedAt} />
        </dl>
        <div className="mt-5 grid gap-2">
          <ButtonLink href={`/novel/${novel.slug}/chapters`} variant="outline" className="w-full">
            <BookOpen className="h-4 w-4" />
            สารบัญทั้งหมด
          </ButtonLink>
          <CompleteButton
            slug={novel.slug}
            initialStatus={userState?.libraryStatus}
            initialHasProgress={Boolean(userState?.progress)}
          />
        </div>
      </section>
    </aside>
  );
}

export function SimilarNovels({ novels }: { novels: Novel[] }) {
  if (!novels.length) return null;
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-h2 font-semibold">เรื่องใกล้เคียง</h2>
        <p className="mt-1 text-sm text-muted-foreground">เชื่อมโยงจากแนวหรือแท็กที่อยู่ใกล้กันในคลัง</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {novels.map((novel) => <SimilarNovelCard key={novel.slug} novel={novel} />)}
      </div>
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
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}
