import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";

import { ChapterBody } from "@/components/reader/chapter-body";
import { ChapterUnlockCard } from "@/components/reader/chapter-unlock-card";
import { PublicViewTracker } from "@/components/analytics/public-view-tracker";
import { ReaderView } from "@/components/reader/reader-view";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth/dal";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { parseChapterNumberSegment, splitChapterParagraphs } from "@/lib/domain/chapter";
import { getNovelTaste } from "@/lib/domain/reader-taste";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getAdjacentChapters, getChapterWindow, getNovelBySlug, getPublishedChapter } from "@/services/novel-service";
import {
  getStaffPublishedChapterContent,
  getUnlockedChapterIds,
  getUnlockedPublishedChapterContent,
  getWalletBalance,
} from "@/services/coin-service";
import { getUserNovelState } from "@/services/user-service";

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
  await connection();
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
    title: `${novel.thaiTitle} ตอนที่ ${published.chapter.number}: ${published.chapter.title} อ่านออนไลน์`,
    description: `อ่าน ${novel.thaiTitle} ตอนที่ ${published.chapter.number} ${published.chapter.title} ภาษาไทยออนไลน์ เปิดอ่านตอนก่อนหน้า ตอนถัดไป และสารบัญทุกตอน`,
    path: `/novel/${slug}/chapter/${published.chapter.number}`,
    image: novel.cover,
    type: "article",
    publishedTime: published.chapter.publishedAt ?? published.chapter.updatedAt,
    modifiedTime: published.chapter.updatedAt,
  });
}

export default async function ChapterPage({ params }: ChapterRouteProps) {
  const { slug, chapter } = await params;
  const parsed = parseChapterNumberSegment(chapter);
  if (!parsed) notFound();
  await connection();

  const [novel, published, adjacent, chapterWindow, currentUser] = await Promise.all([
    getNovelBySlug(slug),
    getPublishedChapter(slug, parsed.number),
    getAdjacentChapters(slug, parsed.number),
    getChapterWindow(slug, parsed.number),
    getCurrentUser(),
  ]);
  if (!novel || !published) notFound();
  if (!parsed.isCanonical) {
    permanentRedirect(`/novel/${novel.slug}/chapter/${parsed.canonical}`);
  }

  const { chapter: chapterSummary, locked: commerciallyLocked } = published;
  const activeUser = currentUser?.status === "ACTIVE" ? currentUser : null;
  const staffAccess = activeUser ? canAccessAdmin(activeUser) : false;
  const chapterIds = [...new Set([
    ...(chapterSummary.id ? [chapterSummary.id] : []),
    ...chapterWindow.items.flatMap((item) => item.id ? [item.id] : []),
  ])];
  const [userState, unlockedChapterIds, walletBalance, fullPaidContent] = await Promise.all([
    activeUser ? getUserNovelState(activeUser.id, novel.slug) : Promise.resolve(null),
    activeUser && !staffAccess ? getUnlockedChapterIds(activeUser.id, chapterIds) : Promise.resolve([]),
    activeUser && commerciallyLocked && !staffAccess ? getWalletBalance(activeUser.id) : Promise.resolve(0),
    activeUser && commerciallyLocked && chapterSummary.id
      ? staffAccess
        ? getStaffPublishedChapterContent(activeUser, chapterSummary.id)
        : getUnlockedPublishedChapterContent(activeUser.id, chapterSummary.id)
      : Promise.resolve(null),
  ]);
  const unlocked = new Set(unlockedChapterIds);
  const hasPaidAccess = staffAccess || Boolean(chapterSummary.id && unlocked.has(chapterSummary.id));
  const locked = commerciallyLocked && !hasPaidAccess;
  const content = commerciallyLocked && hasPaidAccess ? fullPaidContent : published.content;
  if (commerciallyLocked && hasPaidAccess && content === null) notFound();

  const applyAccess = (item: typeof chapterSummary | undefined) => item
    ? { ...item, locked: Boolean(item.locked && !staffAccess && !(item.id && unlocked.has(item.id))) }
    : undefined;
  const accessibleWindow = {
    ...chapterWindow,
    items: chapterWindow.items.map((item) => applyAccess(item)!),
    earlierBoundary: applyAccess(chapterWindow.earlierBoundary),
    laterBoundary: applyAccess(chapterWindow.laterBoundary),
  };
  const paragraphs = splitChapterParagraphs(content ?? "");
  const taste = getNovelTaste(novel);
  return (
    <>
      <PublicViewTracker slug={novel.slug} chapterNumber={chapterSummary.number} />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${absoluteUrl(`/novel/${novel.slug}/chapter/${chapterSummary.number}`)}#article`,
            headline: `${novel.thaiTitle} ตอนที่ ${chapterSummary.number}: ${chapterSummary.title}`,
            name: `ตอนที่ ${chapterSummary.number}: ${chapterSummary.title}`,
            position: chapterSummary.sortOrder ?? chapterSummary.number,
            isPartOf: {
              "@type": "Book",
              "@id": `${absoluteUrl(`/novel/${novel.slug}`)}#book`,
              name: novel.thaiTitle,
              url: absoluteUrl(`/novel/${novel.slug}`),
            },
            mainEntityOfPage: absoluteUrl(`/novel/${novel.slug}/chapter/${chapterSummary.number}`),
            url: absoluteUrl(`/novel/${novel.slug}/chapter/${chapterSummary.number}`),
            image: absoluteUrl(novel.cover),
            author: { "@type": "Person", name: novel.author },
            translator: novel.translator
              ? { "@type": "Organization", name: novel.translator }
              : undefined,
            publisher: { "@id": `${absoluteUrl("/")}#organization` },
            datePublished: chapterSummary.publishedAt ?? chapterSummary.updatedAt,
            dateModified: chapterSummary.updatedAt,
            isAccessibleForFree: !commerciallyLocked,
            inLanguage: "th-TH",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "หน้าแรก", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "นิยาย", item: absoluteUrl("/novels") },
              { "@type": "ListItem", position: 3, name: novel.thaiTitle, item: absoluteUrl(`/novel/${novel.slug}`) },
              { "@type": "ListItem", position: 4, name: `ตอนที่ ${chapterSummary.number}`, item: absoluteUrl(`/novel/${novel.slug}/chapter/${chapterSummary.number}`) },
            ],
          },
        ]}
      />
      <ReaderView
        key={chapterSummary.id ?? chapterSummary.number}
        novel={{
          id: novel.id,
          slug: novel.slug,
          thaiTitle: novel.thaiTitle,
          cover: novel.cover,
          status: novel.status,
        }}
        chapter={applyAccess(chapterSummary)!}
        previous={applyAccess(adjacent.previous)}
        next={applyAccess(adjacent.next)}
        chapterWindow={accessibleWindow}
        locked={locked}
        lockedContent={locked ? (
          <ChapterUnlockCard
            novelSlug={novel.slug}
            novelTitle={novel.thaiTitle}
            chapterNumber={chapterSummary.number}
            price={chapterSummary.coinPrice ?? 0}
            balance={walletBalance}
            isAuthenticated={Boolean(activeUser)}
          />
        ) : undefined}
        isAuthenticated={Boolean(activeUser)}
        initialLibraryStatus={userState?.libraryStatus}
        initialFollowing={userState?.followed}
        initialProgress={userState?.progress}
        matureWarning={{ heat: taste.heat, warnings: taste.warnings }}
      >
        <ChapterBody paragraphs={paragraphs} teaser={locked} />
      </ReaderView>
    </>
  );
}
