import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { NovelBrowser } from "@/components/interactive/novel-browser";
import { NovelGrid } from "@/components/novels/novel-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/ui/section";
import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import {
  canonicalizeNovelSearchParams,
  novelBrowseHref,
  rawSearchParamsHref,
  type RawSearchParams,
} from "@/lib/validation/public-query";
import { getGenreBySlug, getGenreFacets, getGenreRising, getNovelPage, getNovels, getRankings } from "@/services/novel-service";
import type { Novel } from "@/types/novel";
import type { NovelQuery } from "@/types/novel-query";

async function getCachedGenreEditorial(slug: string) {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.catalog);
  cacheTag("public-novels", "public-rankings", "public-taxonomy");

  const [top, rising, recent, completed] = await Promise.all([
    getNovels({ genre: slug, sort: "popular" }, 6),
    getGenreRising(slug, 6),
    getNovels({ genre: slug, sort: "updated" }, 6),
    getNovels({ genre: slug, status: "completed", sort: "rating" }, 6),
  ]);
  return { top, rising, recent, completed };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return pageMetadata({ title: "ไม่พบหมวดหมู่", description: "ไม่พบหมวดหมู่นี้", path: `/genre/${slug}`, noIndex: true });
  return pageMetadata({
    title: `นิยาย${genre.thaiName}`,
    description: genre.description || `รวมนิยาย${genre.thaiName} ${genre.count.toLocaleString("th-TH")} เรื่อง`,
    path: `/genre/${genre.slug}`,
  });
}

export default async function GenreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const genre = await getGenreBySlug(slug);
  if (!genre) notFound();
  const visibleQuery = canonicalizeNovelSearchParams(raw, { activeGenreSlugs: [] }).query;
  const query: NovelQuery = { ...visibleQuery, genre: genre.slug };
  const [result, facets, suggestions, editorial] = await Promise.all([
    getNovelPage(query),
    getGenreFacets(query),
    getRankings("WEEKLY", 6),
    getCachedGenreEditorial(genre.slug),
  ]);
  const { top, rising, recent, completed } = editorial;
  const canonicalQuery: NovelQuery = { ...visibleQuery, page: result.page > 1 ? result.page : undefined };
  const browseHref = novelBrowseHref(canonicalQuery, []);
  const canonicalHref = `/genre/${genre.slug}${browseHref.slice("/novels".length)}`;
  if (rawSearchParamsHref(`/genre/${genre.slug}`, raw) !== canonicalHref) redirect(canonicalHref);

  return (
    <PageShell className="space-y-14">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `นิยาย${genre.thaiName}`,
        description: genre.description,
        url: absoluteUrl(`/genre/${genre.slug}`),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: result.total,
          itemListElement: result.items.map((novel, index) => ({
            "@type": "ListItem",
            position: (result.page - 1) * result.pageSize + index + 1,
            name: novel.thaiTitle,
            url: absoluteUrl(`/novel/${novel.slug}`),
          })),
        },
      }} />

      <header className="border-y border-border py-5 sm:py-6">
        <p className="editorial-kicker">โลกและอารมณ์ของเรื่อง</p>
        <h1 className="mt-1 max-w-3xl text-h1 font-semibold sm:text-display">นิยาย{genre.thaiName}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          {genre.description || `สำรวจเรื่องในหมวด${genre.thaiName} ตั้งแต่เรื่องยอดนิยมจนถึงเรื่องที่เพิ่งอัปเดต`}
        </p>
        <p className="tabular mt-4 text-xs font-medium text-[var(--brand-emphasis)]">{genre.count.toLocaleString("th-TH")} เรื่องในคลัง</p>
      </header>

      <EditorialShelf kicker="ความนิยมในหมวด" title="เรื่องเด่น" novels={top} />
      <EditorialShelf kicker="จากการอ่านจริงใน 7 วันล่าสุด" title={`กำลังมาแรงในแนว${genre.thaiName}`} novels={rising} />
      <EditorialShelf kicker="เรียงตามเวลาอัปเดต" title="เพิ่งมีตอนใหม่" novels={recent} />
      <EditorialShelf kicker="อ่านได้จนจบ" title="เรื่องจบแล้ว" novels={completed} />

      <NovelBrowser
        query={query}
        pagination={{ page: result.page, total: result.total, totalPages: result.totalPages, pageSize: result.pageSize }}
        facets={facets}
        results={<NovelGrid novels={result.items} />}
        emptySuggestions={<NovelGrid novels={suggestions} />}
        hasResults={result.items.length > 0}
        hasSuggestions={suggestions.length > 0}
        resultCount={result.items.length}
        title={`นิยาย${genre.thaiName}ทั้งหมด`}
        description={`${result.total.toLocaleString("th-TH")} เรื่อง ปรับสถานะ คะแนน จำนวนตอน และเวลาอัปเดตได้`}
        basePath={`/genre/${genre.slug}`}
        fixedGenre={genre.slug}
        headingLevel="h2"
      />
    </PageShell>
  );
}

function EditorialShelf({ kicker, title, novels }: { kicker: string; title: string; novels: Novel[] }) {
  if (!novels.length) return null;
  return (
    <section className="render-deferred">
      <p className="editorial-kicker">{kicker}</p>
      <h2 className="mb-5 mt-1 text-2xl font-semibold">{title}</h2>
      <NovelGrid novels={novels} compact />
    </section>
  );
}
