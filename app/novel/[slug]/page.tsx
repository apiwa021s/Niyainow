import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { ViewTransition } from "react";

import { PublicViewTracker } from "@/components/analytics/public-view-tracker";
import { NovelChapterBrowser } from "@/components/novels/novel-chapter-browser";
import { NovelChapterDialogProvider } from "@/components/novels/novel-chapter-dialog-context";
import {
  NovelCommunity,
  NovelHero,
  NovelSynopsis,
} from "@/components/novels/novel-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/ui/section";
import { getCurrentUser } from "@/lib/auth/dal";
import { displayTagName } from "@/lib/domain/tag";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import {
  getNovelBySlug,
  getNovelDetailSections,
  resolveCanonicalPublicNovelSlug,
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
  return pageMetadata({
    title: `${novel.thaiTitle} อ่านออนไลน์`,
    description: `อ่าน ${novel.thaiTitle} ออนไลน์ ${novel.chapters.toLocaleString("th-TH")} ตอน สถานะ${status} — ${novel.synopsis}`,
    path: `/novel/${novel.slug}`,
    image: novel.cover,
    type: "article",
    publishedTime: novel.publishedAt,
    modifiedTime: novel.updatedAt,
  });
}

export default async function NovelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const canonicalSlug = await resolveCanonicalPublicNovelSlug(slug);
  if (canonicalSlug && canonicalSlug !== slug) permanentRedirect(`/novel/${canonicalSlug}`);

  const novelPromise = getNovelBySlug(slug);
  const detailSectionsPromise = getNovelDetailSections(slug);
  const userStatePromise = Promise.all([novelPromise, getCurrentUser()]).then(([resolvedNovel, currentUser]) =>
    resolvedNovel && currentUser?.status === "ACTIVE"
      ? getUserNovelState(currentUser.id, slug)
      : undefined,
  );
  const [novel, detailSections, userState] = await Promise.all([
    novelPromise,
    detailSectionsPromise,
    userStatePromise,
  ]);
  if (!novel) notFound();

  const firstChapter = detailSections.firstChapters[0];
  const startHref = firstChapter
    ? `/novel/${novel.slug}/chapter/${firstChapter.number}`
    : "#novel-chapters";
  const startLabel = firstChapter ? "เริ่มอ่าน" : "ดูสารบัญ";

  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
    <PageShell className="max-w-[1320px] pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-24">
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
            potentialAction: firstChapter
              ? {
                  "@type": "ReadAction",
                  target: absoluteUrl(startHref),
                }
              : undefined,
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

      <NovelChapterDialogProvider>
        <NovelHero
          novel={novel}
          startHref={startHref}
          startLabel={startLabel}
          userState={userState}
        />
        <div className="mx-auto mt-8 grid max-w-4xl gap-8 sm:mt-10 sm:gap-10">
          <NovelSynopsis novel={novel} />
          <NovelChapterBrowser
            slug={novel.slug}
            firstChapters={detailSections.firstChapters}
            latestChapters={detailSections.latestChapters}
            chapterCount={novel.chapters}
            startHref={startHref}
            startLabel={startLabel}
            serverProgress={userState?.progress}
            libraryStatus={userState?.libraryStatus}
            followed={userState?.followed}
          />
          <NovelCommunity novel={novel} userState={userState} reviews={detailSections.reviews} />
        </div>
      </NovelChapterDialogProvider>
    </PageShell>
    </ViewTransition>
  );
}
