import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicViewTracker } from "@/components/analytics/public-view-tracker";
import {
  ChapterPreview,
  NovelCommunity,
  NovelHero,
  NovelMetaRail,
  NovelSignals,
  SimilarNovels,
} from "@/components/novels/novel-detail";
import { NovelResumeMobileBar } from "@/components/reader/novel-resume-actions";
import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/ui/section";
import { getCurrentUser } from "@/lib/auth/dal";
import { displayTagName } from "@/lib/domain/tag";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import {
  getChapters,
  getLatestChapters,
  getNovelBySlug,
  getPublishedReviews,
  getSimilarNovels,
} from "@/services/novel-service";
import { getUserNovelState } from "@/services/user-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const novel = await getNovelBySlug(slug);
  if (!novel) {
    return pageMetadata({
      title: "ไม่พบนิยาย",
      description: "ไม่พบนิยายเรื่องนี้",
      path: `/novel/${slug}`,
      noIndex: true,
    });
  }
  const status = novel.status === "completed" ? "จบแล้ว" : novel.status === "hiatus" ? "พักการอัปเดต" : "กำลังอัปเดต";
  const credit = novel.translator ? `แปลโดย ${novel.translator}` : `ผู้เขียน ${novel.author}`;
  return pageMetadata({
    title: `${novel.thaiTitle} อ่านออนไลน์`,
    description: `อ่าน ${novel.thaiTitle} ออนไลน์ ${credit} ${novel.chapters.toLocaleString("th-TH")} ตอน สถานะ${status} — ${novel.synopsis}`,
    path: `/novel/${novel.slug}`,
    image: novel.cover,
    type: "article",
    publishedTime: novel.publishedAt,
    modifiedTime: novel.updatedAt,
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
  const userState = currentUser?.status === "ACTIVE"
    ? await getUserNovelState(currentUser.id, slug)
    : undefined;
  const firstChapter = firstChapters[0];
  const startHref = firstChapter
    ? `/novel/${novel.slug}/chapter/${firstChapter.number}`
    : `/novel/${novel.slug}/chapters`;
  const startLabel = firstChapter ? "เริ่มอ่าน" : "ดูสารบัญ";

  return (
    <PageShell className="pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-24">
      <PublicViewTracker slug={novel.slug} />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Book",
            "@id": `${absoluteUrl(`/novel/${novel.slug}`)}#book`,
            name: novel.thaiTitle,
            alternateName: novel.title !== novel.thaiTitle ? novel.title : undefined,
            description: novel.synopsis,
            image: absoluteUrl(novel.cover),
            url: absoluteUrl(`/novel/${novel.slug}`),
            mainEntityOfPage: absoluteUrl(`/novel/${novel.slug}`),
            author: { "@type": "Person", name: novel.author },
            translator: novel.translator
              ? { "@type": "Organization", name: novel.translator }
              : undefined,
            publisher: { "@id": `${absoluteUrl("/")}#organization` },
            inLanguage: "th-TH",
            bookFormat: "https://schema.org/EBook",
            datePublished: novel.publishedAt,
            dateModified: novel.updatedAt,
            isAccessibleForFree: !novel.hasPaidChapters,
            aggregateRating: novel.rating > 0 && novel.ratingCount
              ? {
                  "@type": "AggregateRating",
                  ratingValue: novel.rating,
                  bestRating: 5,
                  ratingCount: novel.ratingCount,
                }
              : undefined,
            genre: novel.genres.map((genre) => novel.genreNames?.[genre] ?? genre),
            keywords: novel.tags.map((tag) => displayTagName(novel.tagNames?.[tag] ?? tag)),
            potentialAction: {
              "@type": "ReadAction",
              target: absoluteUrl(startHref),
            },
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

      <nav aria-label="เส้นทาง" className="mb-5 flex min-h-11 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-foreground">หน้าแรก</Link>
        <span aria-hidden>/</span>
        <Link href="/novels" className="inline-flex min-h-11 items-center hover:text-foreground">นิยาย</Link>
        <span aria-hidden>/</span>
        <span className="line-clamp-1 text-foreground">{novel.thaiTitle}</span>
      </nav>

      <NovelHero
        novel={novel}
        startHref={startHref}
        startLabel={startLabel}
        userState={userState}
      />
      <NovelResumeMobileBar
        slug={novel.slug}
        title={novel.thaiTitle}
        startHref={startHref}
        startLabel={startLabel}
        serverProgress={userState?.progress}
        followed={userState?.followed}
        libraryStatus={userState?.libraryStatus}
      />
      <NovelSignals novel={novel} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10">
          <ChapterPreview slug={novel.slug} chapters={latestChapters} />
          <NovelCommunity novel={novel} userState={userState} reviews={reviews} />
        </div>
        <NovelMetaRail novel={novel} userState={userState} />
      </div>

      <div className="mt-12">
        <SimilarNovels novels={similar} />
      </div>
    </PageShell>
  );
}
