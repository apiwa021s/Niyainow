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
import { getGenreFacets, getGenres, getNovelPage, getRankings, getTagBySlug } from "@/services/novel-service";
import type { NovelQuery } from "@/types/novel-query";

async function getTagBrowseData(query: NovelQuery) {
  const [result, facets, suggestions] = await Promise.all([
    getNovelPage(query),
    getGenreFacets(query),
    getRankings("WEEKLY", 6),
  ]);
  return { result, facets, suggestions };
}

async function getCachedTagBrowse(slug: string) {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.catalog);
  cacheTag("public-novels", "public-rankings", "public-taxonomy");

  const query: NovelQuery = { tag: slug };
  return getTagBrowseData(query);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return pageMetadata({ title: "ไม่พบแท็ก", description: "ไม่พบแท็กนี้", path: `/tag/${slug}`, noIndex: true });
  return pageMetadata({ title: `นิยายแท็ก ${tag.name}`, description: tag.description || `รวมนิยายที่ติดแท็ก ${tag.name}`, path: `/tag/${tag.slug}` });
}

export default async function TagDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> }) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const [tag, allGenres] = await Promise.all([getTagBySlug(slug), getGenres(200)]);
  if (!tag) notFound();
  const visibleQuery = canonicalizeNovelSearchParams(raw, {
    activeGenreSlugs: allGenres.map((genre) => genre.slug),
  }).query;
  const query: NovelQuery = { ...visibleQuery, tag: tag.slug };
  const defaultBrowse = Object.keys(visibleQuery).length === 0;
  const { result, facets, suggestions } = defaultBrowse
    ? await getCachedTagBrowse(tag.slug)
    : await getTagBrowseData(query);
  const canonicalQuery: NovelQuery = { ...visibleQuery, page: result.page > 1 ? result.page : undefined };
  const browseHref = novelBrowseHref(canonicalQuery, allGenres.map((genre) => genre.slug));
  const canonicalHref = `/tag/${tag.slug}${browseHref.slice("/novels".length)}`;
  if (rawSearchParamsHref(`/tag/${tag.slug}`, raw) !== canonicalHref) redirect(canonicalHref);
  const title = `นิยายแท็ก ${tag.name}`;
  return (
    <PageShell className="space-y-10">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description: tag.description,
        url: absoluteUrl(`/tag/${tag.slug}`),
        mainEntity: { "@type": "ItemList", numberOfItems: result.total, itemListElement: result.items.map((novel, index) => ({ "@type": "ListItem", position: (result.page - 1) * result.pageSize + index + 1, name: novel.thaiTitle, url: absoluteUrl(`/novel/${novel.slug}`) })) },
      }} />
      <header className="py-2 sm:py-3">
        <p className="editorial-kicker">เส้นเรื่องและองค์ประกอบ</p>
        <h1 className="mt-1 text-h1 font-semibold sm:text-display">#{tag.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{tag.description || `เรื่องทั้งหมดที่จัดอยู่ในแท็ก ${tag.name}`}</p>
        <p className="tabular mt-4 text-xs font-medium text-[var(--brand-emphasis)]">{tag.count.toLocaleString("th-TH")} เรื่อง</p>
      </header>
      <NovelBrowser
        query={query}
        pagination={{ page: result.page, total: result.total, totalPages: result.totalPages, pageSize: result.pageSize }}
        facets={facets}
        results={<NovelGrid novels={result.items} />}
        emptySuggestions={<NovelGrid novels={suggestions} />}
        hasResults={result.items.length > 0}
        hasSuggestions={suggestions.length > 0}
        resultCount={result.items.length}
        title="ผลลัพธ์ทั้งหมด"
        basePath={`/tag/${tag.slug}`}
        fixedTag={tag.slug}
        headingLevel="h2"
      />
    </PageShell>
  );
}
