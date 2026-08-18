import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ChapterList } from "@/components/novels/chapter-list";
import { JsonLd } from "@/components/seo/json-ld";
import { EmptyState, PageShell } from "@/components/ui/section";
import { getCurrentUser } from "@/lib/auth/dal";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getChapterCatalogPage, getNovelBySlug } from "@/services/novel-service";
import { getUserNovelState } from "@/services/user-service";
import { parsePositivePage } from "@/types/novel-query";

type ChapterSearchParams = {
  page?: string;
  q?: string;
  order?: string;
  from?: string;
  to?: string;
  jump?: string;
};

function positiveInteger(value: string | undefined) {
  if (!value || !/^\d+$/u.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function chapterNumber(value: string | undefined) {
  if (!value || !/^\d+(?:\.\d+)?$/u.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function catalogUrl(slug: string, values: ChapterSearchParams & { resolvedPage?: number }) {
  const query = new URLSearchParams();
  if (values.q?.trim()) query.set("q", values.q.trim());
  if (values.order === "oldest") query.set("order", "oldest");
  if (positiveInteger(values.from)) query.set("from", values.from!);
  if (positiveInteger(values.to)) query.set("to", values.to!);
  if (chapterNumber(values.jump) !== null) query.set("jump", values.jump!);
  if ((values.resolvedPage ?? 1) > 1) query.set("page", String(values.resolvedPage));
  const suffix = query.toString();
  return `/novel/${slug}/chapters${suffix ? `?${suffix}` : ""}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ChapterSearchParams>;
}): Promise<Metadata> {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const novel = await getNovelBySlug(slug);
  const pageNumber = parsePositivePage(filters.page);
  if (!novel) return pageMetadata({ title: "สารบัญ", description: "ไม่พบนิยายเรื่องนี้", path: `/novel/${slug}/chapters`, noIndex: true });
  return pageMetadata({
    title: `สารบัญ ${novel.thaiTitle}${pageNumber > 1 ? ` หน้า ${pageNumber}` : ""}`,
    description: `รายชื่อตอนที่เผยแพร่ของ ${novel.thaiTitle}`,
    path: catalogUrl(novel.slug, { ...filters, resolvedPage: pageNumber }),
    noIndex: Boolean(filters.q || filters.jump || filters.from || filters.to || filters.order === "oldest"),
  });
}

export default async function ChaptersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ChapterSearchParams>;
}) {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const requestedPage = parsePositivePage(filters.page);
  const [novel, currentUser] = await Promise.all([getNovelBySlug(slug), getCurrentUser()]);
  if (!novel) notFound();

  const [catalog, userState] = await Promise.all([
    getChapterCatalogPage(novel.slug, {
      page: requestedPage,
      order: filters.order === "oldest" ? "oldest" : "latest",
      query: filters.q,
      rangeStart: positiveInteger(filters.from),
      rangeEnd: positiveInteger(filters.to),
      jumpChapter: chapterNumber(filters.jump),
    }),
    currentUser?.status === "ACTIVE" ? getUserNovelState(currentUser.id, novel.slug) : Promise.resolve(null),
  ]);

  if (requestedPage !== catalog.page) {
    redirect(catalogUrl(novel.slug, { ...filters, resolvedPage: catalog.page }));
  }

  return (
    <PageShell className="space-y-5">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `สารบัญ ${novel.thaiTitle}`,
          numberOfItems: catalog.total,
          itemListElement: catalog.items.map((chapter, index) => ({
            "@type": "ListItem",
            position: (catalog.page - 1) * catalog.pageSize + index + 1,
            name: `ตอนที่ ${chapter.number}: ${chapter.title}`,
            url: absoluteUrl(`/novel/${novel.slug}/chapter/${chapter.number}`),
          })),
        }}
      />
      <div className="border-y border-border py-5 sm:py-6">
        <p className="editorial-kicker">CHAPTER INDEX / สารบัญตอน</p>
        <h1 className="mt-1 text-h1 font-semibold sm:text-display">สารบัญ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {novel.thaiTitle} · {catalog.catalogTotal.toLocaleString("th-TH")} ตอน
          {catalog.total !== catalog.catalogTotal ? ` · พบ ${catalog.total.toLocaleString("th-TH")} ตอน` : ""}
        </p>
      </div>
      {catalog.catalogTotal > 0 ? (
        <ChapterList
          slug={novel.slug}
          catalog={catalog}
          serverProgress={userState?.progress}
          latestChapterNumber={novel.latestChapter?.number}
        />
      ) : (
        <EmptyState title="ยังไม่มีตอนที่เผยแพร่" description="กลับมาดูใหม่เมื่อนักเขียนเผยแพร่ตอนแรก" />
      )}
    </PageShell>
  );
}
