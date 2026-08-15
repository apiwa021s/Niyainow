import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ChapterContent } from "@/components/reader/chapter-content";
import { PublicViewTracker } from "@/components/analytics/public-view-tracker";
import { ReaderView } from "@/components/reader/reader-view";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth/dal";
import { parseChapterNumberSegment, splitChapterParagraphs } from "@/lib/domain/chapter";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getAdjacentChapters, getChapters, getNovelBySlug, getPublishedChapter } from "@/services/novel-service";

type ChapterRouteProps = { params: Promise<{ slug: string; chapter: string }> };

export async function generateMetadata({ params }: ChapterRouteProps): Promise<Metadata> {
  const { slug, chapter } = await params;
  const parsed = parseChapterNumberSegment(chapter);
  if (!parsed) {
    return pageMetadata({
      title: "ไม่พบตอน",
      description: "ไม่พบตอนที่ต้องการ",
      path: `/novel/${slug}/chapters`,
      noIndex: true,
    });
  }
  const [novel, published] = await Promise.all([
    getNovelBySlug(slug),
    getPublishedChapter(slug, parsed.number),
  ]);
  if (!novel || !published) {
    return pageMetadata({
      title: "ไม่พบตอน",
      description: "ไม่พบตอนที่ต้องการ",
      path: `/novel/${slug}/chapters`,
      noIndex: true,
    });
  }

  return pageMetadata({
    title: `${novel.thaiTitle} ตอนที่ ${published.chapter.number}: ${published.chapter.title}`,
    description: `อ่าน ${novel.thaiTitle} ตอนที่ ${published.chapter.number} ภาษาไทย`,
    path: `/novel/${slug}/chapter/${published.chapter.number}`,
    image: novel.cover,
    type: "article",
  });
}

export default async function ChapterPage({ params }: ChapterRouteProps) {
  const { slug, chapter } = await params;
  const parsed = parseChapterNumberSegment(chapter);
  if (!parsed) notFound();

  const [novel, published, adjacent, chapters, currentUser] = await Promise.all([
    getNovelBySlug(slug),
    getPublishedChapter(slug, parsed.number),
    getAdjacentChapters(slug, parsed.number),
    getChapters(slug, 50),
    getCurrentUser(),
  ]);
  if (!novel || !published) notFound();
  if (!parsed.isCanonical) {
    permanentRedirect(`/novel/${novel.slug}/chapter/${parsed.canonical}`);
  }

  const { chapter: chapterSummary, content, locked } = published;
  const paragraphs = splitChapterParagraphs(content ?? "");
  return (
    <>
      <PublicViewTracker slug={novel.slug} chapterNumber={chapterSummary.number} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${novel.thaiTitle} ตอนที่ ${chapterSummary.number}: ${chapterSummary.title}`,
          isPartOf: { "@type": "Book", name: novel.thaiTitle, url: absoluteUrl(`/novel/${novel.slug}`) },
          mainEntityOfPage: absoluteUrl(`/novel/${novel.slug}/chapter/${chapterSummary.number}`),
          inLanguage: "th",
        }}
      />
      <ReaderView
        novel={novel}
        chapter={chapterSummary}
        previous={adjacent.previous}
        next={adjacent.next}
        chapters={chapters}
        locked={locked}
        isAuthenticated={currentUser?.status === "ACTIVE"}
      >
        <ChapterContent paragraphs={paragraphs} teaser={locked} />
      </ReaderView>
    </>
  );
}
