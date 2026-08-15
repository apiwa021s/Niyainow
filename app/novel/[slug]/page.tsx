import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, BookOpen, ChevronDown, ListOrdered, Play, Star } from "lucide-react";

import { CompleteButton, FollowButton, LibraryButton, NovelActionBar, ShareButton } from "@/components/interactive/novel-actions";
import { PublicViewTracker } from "@/components/analytics/public-view-tracker";
import { RatingReviewForm } from "@/components/interactive/rating-review-form";
import { NovelCardHorizontal } from "@/components/novels/novel-card";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageShell, SectionHeader } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth/dal";
import { absoluteUrl } from "@/lib/site-config";
import { formatNumber } from "@/lib/utils";
import {
  getChapters,
  getLatestChapters,
  getNovelBySlug,
  getPublishedReviews,
  getSimilarNovels,
} from "@/services/novel-service";
import { getUserNovelState } from "@/services/user-service";
import type { Novel } from "@/types/novel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const novel = await getNovelBySlug(slug);
  if (!novel) return pageMetadata({ title: "ไม่พบนิยาย", description: "ไม่พบนิยายเรื่องนี้", path: `/novel/${slug}`, noIndex: true });
  return pageMetadata({
    title: novel.thaiTitle,
    description: novel.synopsis,
    path: `/novel/${novel.slug}`,
    image: novel.cover,
    type: "article",
  });
}

/** ตัวเลขสถิติในแถบใต้หัวเรื่อง — ป้ายกำกับอยู่บน ค่าตัวใหญ่อยู่ล่าง อ่านเร็วกว่าแบบบรรทัดเดียว */
function StatCell({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 px-4 py-3 text-center sm:px-6">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-1 truncate text-lg font-bold sm:text-xl">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
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

function statusMeta(status: Novel["status"]) {
  if (status === "completed") return { label: "จบแล้ว", dot: "bg-foreground" };
  if (status === "hiatus") return { label: "พักการแปล", dot: "bg-amber-500" };
  return { label: "กำลังแปล", dot: "bg-[var(--brand-primary)]" };
}

export default async function NovelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const novel = await getNovelBySlug(slug);
  if (!novel) notFound();
  const [firstChapters, latestChapters, similar, reviews, currentUser] = await Promise.all([
    getChapters(slug, 1),
    getLatestChapters(slug, 5),
    getSimilarNovels(slug, 4),
    getPublishedReviews(slug, 6),
    getCurrentUser(),
  ]);
  const userState = currentUser?.status === "ACTIVE" ? await getUserNovelState(currentUser.id, slug) : undefined;
  const firstChapter = firstChapters[0];
  const startHref = firstChapter
    ? `/novel/${novel.slug}/chapter/${firstChapter.number}`
    : `/novel/${novel.slug}/chapters`;
  const continueChapter = userState?.progress
    ? firstChapters.find((chapter) => chapter.id === userState.progress?.chapterId)
    : undefined;
  const primaryHref = continueChapter ? `/novel/${novel.slug}/chapter/${continueChapter.number}` : startHref;
  const primaryLabel = continueChapter ? `อ่านต่อ ตอนที่ ${continueChapter.number}` : firstChapter ? "เริ่มอ่าน" : "ดูสารบัญ";
  const status = statusMeta(novel.status);

  return (
    // pb เผื่อแถบคำสั่งลอย (56px) + bottom nav (56px) + safe-area บนมือถือ
    <PageShell className="space-y-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:space-y-6 lg:pb-24">
      <PublicViewTracker slug={novel.slug} />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Book",
            name: novel.thaiTitle,
            alternateName: novel.title !== novel.thaiTitle ? novel.title : undefined,
            description: novel.synopsis,
            image: novel.cover,
            url: absoluteUrl(`/novel/${novel.slug}`),
            author: { "@type": "Person", name: novel.author },
            inLanguage: "th",
            aggregateRating: novel.rating > 0 && novel.ratingCount
              ? { "@type": "AggregateRating", ratingValue: novel.rating, bestRating: 5, ratingCount: novel.ratingCount }
              : undefined,
            genre: novel.genres.map((genre) => novel.genreNames?.[genre] ?? genre),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "หน้าแรก", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "นิยาย", item: absoluteUrl("/novels") },
              { "@type": "ListItem", position: 3, name: novel.thaiTitle, item: absoluteUrl(`/novel/${novel.slug}`) },
            ],
          },
        ]}
      />

      <nav aria-label="เส้นทาง" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">หน้าแรก</Link><span aria-hidden>/</span>
        <Link href="/novels" className="hover:text-foreground">นิยาย</Link><span aria-hidden>/</span>
        <span className="line-clamp-1 text-foreground">{novel.thaiTitle}</span>
      </nav>

      <section className="relative overflow-hidden rounded-[8px] border border-border bg-card">
        <span aria-hidden className="absolute inset-y-0 right-0 hidden w-[30%] opacity-[0.08] xl:block"><Image src={novel.backdrop} alt="" fill sizes="420px" className="object-cover" /></span>
        <div className="relative grid gap-6 p-5 sm:p-7 md:grid-cols-[220px_1fr] md:gap-8 xl:grid-cols-[240px_minmax(0,1fr)_270px] xl:p-9">
          <div className="mx-auto w-[160px] sm:w-[190px] md:mx-0 md:w-full">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[6px] border border-border bg-muted shadow-[var(--sh-2)]">
              <Image src={novel.cover} alt={`ปกนิยาย ${novel.thaiTitle}`} fill sizes="(max-width: 768px) 190px, 240px" className="object-cover" priority />
            </div>
          </div>

          <div className="min-w-0 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="rounded-[4px] bg-[var(--brand-primary)] px-2 py-1 text-[11px] font-semibold text-white">{status.label}</span>
              {novel.genres.map((genre) => <Link key={genre} href={`/genre/${genre}`} className="rounded-[4px] border border-border px-2 py-1 text-xs text-muted-foreground hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">{novel.genreNames?.[genre] ?? genre}</Link>)}
            </div>

            <p className="editorial-kicker mt-5">BOOK / 物語</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold leading-[1.3] sm:text-4xl xl:text-5xl">{novel.thaiTitle}</h1>
            {novel.title !== novel.thaiTitle ? <p className="mt-2 text-sm text-muted-foreground">{novel.title}</p> : null}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground md:justify-start"><span>โดย {novel.author}</span><BadgeCheck className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden /></p>
            <p className="mt-4 line-clamp-4 text-left text-sm leading-[1.9] text-muted-foreground sm:text-base">{novel.synopsis}</p>

            <div className="mt-6 hidden flex-wrap gap-2.5 lg:flex">
              <ButtonLink href={primaryHref} size="lg"><Play className="h-4 w-4 fill-current" />{primaryLabel}</ButtonLink>
              <LibraryButton slug={novel.slug} initialActive={Boolean(userState?.libraryStatus)} count={novel.bookmarkCount} />
              <FollowButton slug={novel.slug} initialActive={userState?.followed} />
              <ShareButton title={novel.thaiTitle} />
            </div>
            {continueChapter && userState?.progress ? <div className="mt-4 hidden max-w-md lg:block"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>ความคืบหน้าตอนล่าสุด</span><span className="tabular">{Math.round(userState.progress.progressPercent)}%</span></div><div className="h-1 bg-muted"><div className="h-full bg-[var(--brand-primary)]" style={{ width: `${Math.round(userState.progress.progressPercent)}%` }} /></div></div> : null}
          </div>

          <aside className="hidden border-l border-border pl-7 xl:block">
            <p className="editorial-kicker">EDITION INFO</p>
            <dl className="mt-3 divide-y divide-border text-sm">
              <InfoRow label="ผู้เขียน" value={novel.author} />
              {novel.translator ? <InfoRow label="ผู้แปล" value={novel.translator} /> : null}
              <InfoRow label="ตอนล่าสุด" value={novel.latestChapter ? `ตอนที่ ${novel.latestChapter.number}` : "—"} />
              <InfoRow label="อัปเดต" value={novel.updatedAt} />
              <InfoRow label="สถานะ" value={status.label} />
            </dl>
            <ButtonLink href={`/novel/${novel.slug}/chapters`} variant="outline" className="mt-5 w-full"><ListOrdered className="h-4 w-4" />สารบัญทั้งหมด</ButtonLink>
          </aside>
        </div>
      </section>

      <NovelActionBar
        slug={novel.slug}
        startHref={primaryHref}
        startLabel={primaryLabel}
        followed={userState?.followed}
        inLibrary={Boolean(userState?.libraryStatus)}
      />

      {/* ---------- แถบสถิติ ---------- */}
      {/* มือถือ 2 คอลัมน์ (ไม่ต้องเลื่อนแนวนอนเพื่ออ่านสถิติ) → 3 → 5 บนจอใหญ่ */}
      <section aria-label="สถิติของเรื่อง" className="overflow-hidden rounded-[8px] border-y border-border bg-card">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          <StatCell
            label="สถานะ"
            value={
              <span className="flex items-center justify-center gap-2 text-base sm:text-lg">
                <span aria-hidden className={`h-2 w-2 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            }
          />
          <StatCell label="จำนวนตอน" value={`${novel.chapters.toLocaleString("th-TH")} ตอน`} />
          <StatCell label="ยอดอ่าน" value={formatNumber(novel.views)} />
          <StatCell label="อยู่ในคลัง" value={formatNumber(novel.bookmarkCount ?? 0)} />
          <StatCell
            label="คะแนนเฉลี่ย"
            value={
              <span className="flex items-center justify-center gap-1.5">
                <Star className="h-4 w-4 fill-[var(--brand-primary)] text-[var(--brand-primary)]" aria-hidden />
                {novel.rating > 0 ? novel.rating.toFixed(1) : "—"}
              </span>
            }
            hint={novel.ratingCount ? `จาก ${formatNumber(novel.ratingCount)} รีวิว` : "ยังไม่มีคะแนน"}
          />
        </div>
      </section>

      {/* ---------- เนื้อหา + แถบข้าง ---------- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-[8px] border border-border bg-card p-4 sm:p-6">
            <p className="editorial-kicker">SYNOPSIS / あらすじ</p>
            <h2 className="mt-1 font-serif text-xl font-semibold">เรื่องย่อ</h2>
            {/* details/summary ย่อ-ขยายได้โดยไม่ต้องพึ่ง JS ฝั่งไคลเอนต์ */}
            <details className="group mt-3">
              <summary className="list-none [&::-webkit-details-marker]:hidden">
                <p className="whitespace-pre-line text-sm leading-[1.9] text-muted-foreground group-open:line-clamp-none line-clamp-5">
                  {novel.synopsis}
                </p>
                <span className="mt-2 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-[var(--brand-light-on-light)]">
                  <span className="group-open:hidden">เพิ่มเติม</span>
                  <span className="hidden group-open:inline">ย่อ</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                </span>
              </summary>
            </details>
          </section>

          <section className="rounded-[8px] border border-border bg-card p-4 sm:p-6">
            <SectionHeader title="ตอนล่าสุด" href={`/novel/${slug}/chapters`} action="ดูสารบัญทั้งหมด" icon={<ListOrdered className="h-5 w-5 text-[var(--brand-light-on-light)]" />} />
            {latestChapters.length > 0 ? (
              <ul className="divide-y divide-border">
                {latestChapters.map((chapter) => (
                  <li key={chapter.id ?? chapter.number}>
                    <Link
                      href={`/novel/${slug}/chapter/${chapter.number}`}
                      prefetch
                      className="-mx-2 flex items-center justify-between gap-4 rounded-[10px] px-2 py-3 transition-colors hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="tabular mr-2 text-sm text-muted-foreground">ตอนที่ {chapter.number}</span>
                        <span className="text-sm font-medium">{chapter.title}</span>
                      </span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">{chapter.updatedAt}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="ยังไม่มีตอนที่เผยแพร่" description="ติดตามเรื่องนี้เพื่อรับข่าวเมื่อตอนแรกเผยแพร่" />
            )}
          </section>

          <section className="rounded-[8px] border border-border bg-card p-4 sm:p-6">
            <SectionHeader title="ให้คะแนนและเขียนรีวิว" />
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

          {reviews.length > 0 ? (
            <section>
              <SectionHeader title="รีวิวจากนักอ่าน" description={`${formatNumber(novel.ratingCount ?? reviews.length)} รีวิวจากผู้อ่านจริง`} />
              <div className="grid gap-3 md:grid-cols-2">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-[8px] border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold">{review.authorName}</p>
                      {review.rating ? (
                        <span className="tabular flex shrink-0 items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-[var(--brand-primary)] text-[var(--brand-primary)]" aria-hidden />
                          {review.rating}
                        </span>
                      ) : null}
                    </div>
                    {review.isSpoiler ? (
                      <details className="mt-3 rounded-[12px] border border-border bg-muted/40 p-3">
                        <summary className="cursor-pointer text-sm font-semibold">รีวิวนี้มีเนื้อหาสปอยล์ — เลือกเพื่ออ่าน</summary>
                        {review.title ? <h3 className="mt-3 font-semibold">{review.title}</h3> : null}
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{review.content}</p>
                      </details>
                    ) : (
                      <>
                        {review.title ? <h3 className="mt-3 font-semibold">{review.title}</h3> : null}
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{review.content}</p>
                      </>
                    )}
                    <time dateTime={review.createdAt} className="mt-3 block text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(review.createdAt))}
                    </time>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* แถบข้าง — บนจอเล็กไหลลงมาต่อท้ายเนื้อหาตามปกติ */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {novel.tags.length > 0 ? (
            <section className="rounded-[8px] border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">แท็ก</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {novel.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    prefetch
                    className="rounded-[6px] border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--brand-primary)] hover:text-foreground"
                  >
                    #{novel.tagNames?.[tag] ?? tag}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[8px] border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">ข้อมูล</h2>
            <dl className="mt-2 divide-y divide-border">
              <InfoRow label="ผู้เขียน" value={novel.author} />
              {novel.translator ? <InfoRow label="ผู้แปล" value={novel.translator} /> : null}
              <InfoRow label="สถานะ" value={status.label} />
              <InfoRow label="จำนวนตอน" value={`${novel.chapters.toLocaleString("th-TH")} ตอน`} />
              <InfoRow label="อัปเดตล่าสุด" value={novel.updatedAt} />
              {novel.hasPaidChapters ? <InfoRow label="การเข้าถึง" value="มีตอนจำกัดการเข้าถึง" /> : null}
            </dl>
            <div className="mt-4 grid gap-2">
              <ButtonLink href={`/novel/${novel.slug}/chapters`} variant="outline" className="w-full">
                <BookOpen className="h-4 w-4" />
                สารบัญทั้งหมด
              </ButtonLink>
              <CompleteButton slug={novel.slug} initialActive={userState?.libraryStatus === "COMPLETED"} />
            </div>
          </section>
        </aside>
      </div>

      {similar.length > 0 ? (
        <section>
          <SectionHeader title="น่าจะชอบต่อ" description="เรื่องที่ผู้อ่านแนวเดียวกันเลือกอ่าน" />
          <div className="grid gap-3 md:grid-cols-2">
            {similar.map((item) => <NovelCardHorizontal key={item.slug} novel={item} />)}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
