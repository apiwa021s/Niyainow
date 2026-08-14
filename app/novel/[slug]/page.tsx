import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Eye, Star } from "lucide-react";

import { BookmarkButton, CompleteButton, FollowButton } from "@/components/interactive/novel-actions";
import { PublicViewTracker } from "@/components/analytics/public-view-tracker";
import { RatingReviewForm } from "@/components/interactive/rating-review-form";
import { NovelCardHorizontal } from "@/components/novels/novel-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
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
  const statusLabel = novel.status === "completed" ? "จบแล้ว" : novel.status === "hiatus" ? "พัก" : "กำลังแปล";

  return (
    <PageShell className="space-y-8">
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
      <section className="relative overflow-hidden rounded-lg border border-border bg-card">
        <Image src={novel.backdrop} alt="" fill sizes="100vw" className="object-cover opacity-25" priority />
        <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[220px_1fr]">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
            <Image src={novel.cover} alt={`ปกนิยาย ${novel.thaiTitle}`} fill sizes="220px" className="object-cover" priority />
          </div>
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {novel.genres.map((genre) => (
                <Link key={genre} href={`/genre/${genre}`}><Badge>{novel.genreNames?.[genre] ?? genre}</Badge></Link>
              ))}
            </div>
            <div>
              <h1 className="text-3xl font-semibold sm:text-5xl">{novel.thaiTitle}</h1>
              <p className="mt-2 text-muted-foreground">{novel.title} · {novel.author}</p>
              {novel.translator ? <p className="mt-1 text-sm text-muted-foreground">ผู้แปล: {novel.translator}</p> : null}
            </div>
            <p className="max-w-3xl leading-7 text-muted-foreground">{novel.synopsis}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 text-[var(--brand-accent)]" />{novel.rating.toFixed(2)}</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{formatNumber(novel.views)}</span>
              <span>{novel.chapters} ตอน</span>
              <span>{statusLabel}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={startHref} size="lg"><BookOpen className="h-5 w-5" />{firstChapter ? "เริ่มอ่าน" : "ดูสารบัญ"}</ButtonLink>
              <ButtonLink href={`/novel/${novel.slug}/chapters`} variant="secondary">สารบัญ</ButtonLink>
              <FollowButton slug={novel.slug} initialActive={userState?.followed} />
              <BookmarkButton slug={novel.slug} initialActive={Boolean(userState?.libraryStatus)} />
              <CompleteButton slug={novel.slug} initialActive={userState?.libraryStatus === "COMPLETED"} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="ตอนล่าสุด" href={`/novel/${slug}/chapters`} action="ดูสารบัญ" />
        {latestChapters.length > 0 ? (
          <div className="grid gap-2">
            {latestChapters.map((chapter) => (
              <Link
                key={chapter.id ?? chapter.number}
                href={`/novel/${slug}/chapter/${chapter.number}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted"
              >
                <span>ตอนที่ {chapter.number}: {chapter.title}</span>
                <span className="shrink-0 text-sm text-muted-foreground">{chapter.updatedAt}</span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="ยังไม่มีตอนที่เผยแพร่" description="ติดตามเรื่องนี้เพื่อรับข่าวเมื่อตอนแรกเผยแพร่" />
        )}
      </section>

      <section>
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
          <SectionHeader title="รีวิวจากนักอ่าน" />
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{review.authorName}</p>
                  {review.rating ? <span className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 text-[var(--brand-accent)]" />{review.rating}</span> : null}
                </div>
                {review.isSpoiler ? (
                  <details className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
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

      {similar.length > 0 ? (
        <section>
          <SectionHeader title="น่าจะชอบต่อ" />
          <div className="grid gap-3 md:grid-cols-2">
            {similar.map((item) => <NovelCardHorizontal key={item.slug} novel={item} />)}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
