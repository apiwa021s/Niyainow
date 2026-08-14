import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, BookOpen, ChevronDown, ListOrdered, Play, Star } from "lucide-react";

import { CompleteButton, FollowButton, LibraryButton, ShareButton } from "@/components/interactive/novel-actions";
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
  if (status === "completed") return { label: "จบแล้ว", dot: "bg-[var(--brand-blue)]" };
  if (status === "hiatus") return { label: "พักการแปล", dot: "bg-amber-500" };
  return { label: "กำลังแปล", dot: "bg-emerald-500" };
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
  const status = statusMeta(novel.status);

  return (
    <PageShell className="space-y-6">
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

      {/* ---------- หัวเรื่อง ---------- */}
      <section className="relative -mx-4 overflow-hidden sm:-mx-6 lg:mx-0 lg:rounded-[24px] lg:border lg:border-border">
        {/* ปกขยายเบลอเป็นพื้นหลัง + ชั้นทึบทับ เพื่อให้ตัวอักษรผ่าน contrast บนปกทุกโทน */}
        <Image src={novel.backdrop} alt="" fill sizes="100vw" priority className="scale-110 object-cover blur-xl" />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,18,.72),rgba(10,8,18,.94))]" />

        <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,208px)_1fr] md:gap-8 lg:p-10">
          <div className="mx-auto w-[148px] sm:w-[180px] md:mx-0 md:w-full">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[16px] shadow-[0_18px_48px_rgba(0,0,0,.45)] ring-1 ring-white/15">
              <Image src={novel.cover} alt={`ปกนิยาย ${novel.thaiTitle}`} fill sizes="208px" className="object-cover" priority />
            </div>
          </div>

          <div className="min-w-0 text-white">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/75">
              {novel.genres.map((genre, index) => (
                <span key={genre} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden className="text-white/35">•</span> : null}
                  <Link href={`/genre/${genre}`} prefetch className="rounded-[6px] hover:text-white hover:underline">
                    {novel.genreNames?.[genre] ?? genre}
                  </Link>
                </span>
              ))}
            </div>

            <h1 className="mt-2 text-[1.75rem] font-bold leading-[1.25] sm:text-[2.75rem]">{novel.thaiTitle}</h1>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80">
              <span className="flex items-center gap-1.5 font-medium">
                By {novel.author}
                <BadgeCheck className="h-4 w-4 text-[var(--brand-light)]" aria-hidden />
              </span>
              {novel.title !== novel.thaiTitle ? <span className="text-white/55">· {novel.title}</span> : null}
            </p>

            <p className="mt-4 line-clamp-4 max-w-2xl text-sm leading-[1.85] text-white/75 sm:text-base">{novel.synopsis}</p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <ButtonLink href={startHref} size="lg" className="flex-col gap-0 px-7 leading-tight">
                <span className="flex items-center gap-2">
                  <Play className="h-4 w-4 fill-current" />
                  {firstChapter ? "เริ่มอ่าน" : "ดูสารบัญ"}
                </span>
                {firstChapter ? <span className="text-[11px] font-medium opacity-80">ตอนที่ {firstChapter.number}</span> : null}
              </ButtonLink>
              <FollowButton slug={novel.slug} initialActive={userState?.followed} />
              <LibraryButton slug={novel.slug} initialActive={Boolean(userState?.libraryStatus)} count={novel.bookmarkCount} />
              <ShareButton title={novel.thaiTitle} />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- แถบสถิติ ---------- */}
      <section aria-label="สถิติของเรื่อง" className="overflow-x-auto rounded-[16px] border border-border bg-card">
        <div className="flex min-w-max divide-x divide-border sm:min-w-0 sm:justify-around">
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
                <Star className="h-4 w-4 fill-[var(--brand-accent)] text-[var(--brand-accent)]" aria-hidden />
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
          <section className="rounded-[16px] border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">เรื่องย่อ</h2>
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

          <section className="rounded-[16px] border border-border bg-card p-5 sm:p-6">
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

          <section className="rounded-[16px] border border-border bg-card p-5 sm:p-6">
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
                  <article key={review.id} className="rounded-[16px] border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold">{review.authorName}</p>
                      {review.rating ? (
                        <span className="tabular flex shrink-0 items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-[var(--brand-accent)] text-[var(--brand-accent)]" aria-hidden />
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
            <section className="rounded-[16px] border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">แท็ก</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {novel.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    prefetch
                    className="rounded-[8px] border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--brand-light)] hover:text-foreground"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[16px] border border-border bg-card p-5">
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
