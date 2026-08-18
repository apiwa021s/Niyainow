import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ExploreFeed } from "@/components/browse/explore-feed";
import { NovelBrowser } from "@/components/interactive/novel-browser";
import { NovelGrid } from "@/components/novels/novel-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { displayTagName } from "@/lib/domain/tag";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import {
  canonicalizeNovelSearchParams,
  normalizeTagCandidate,
  novelBrowseHref,
  rawSearchParamsHref,
  type RawSearchParams,
} from "@/lib/validation/public-query";
import {
  getCompletedNovels,
  getGenreFacets,
  getGenres,
  getGenreShowcase,
  getNewThisWeek,
  getNovelPage,
  getRankings,
  getTagBySlug,
} from "@/services/novel-service";
import { parseGenreParam, type NovelQuery } from "@/types/novel-query";

type SearchParams = RawSearchParams;


const getCanonicalNovelPage = cache((queryKey: string) =>
  getNovelPage(JSON.parse(queryKey) as NovelQuery),
);

async function resolveBrowseRequest(raw: SearchParams) {
  const tagCandidate = normalizeTagCandidate(raw.tag);
  const [allGenres, activeTag] = await Promise.all([
    getGenres(200),
    tagCandidate ? getTagBySlug(tagCandidate) : Promise.resolve(undefined),
  ]);
  const normalized = canonicalizeNovelSearchParams(raw, {
    activeGenreSlugs: allGenres.map((genre) => genre.slug),
    activeTagSlug: activeTag?.slug,
  });
  return { ...normalized, allGenres, activeTag };
}

const getCanonicalBrowseRequest = cache((rawKey: string) =>
  resolveBrowseRequest(JSON.parse(rawKey) as SearchParams),
);

function resolvedPageQuery(query: NovelQuery, page: number): NovelQuery {
  const resolved = { ...query };
  if (page > 1) resolved.page = page;
  else delete resolved.page;
  return resolved;
}

function browseHeading(
  query: NovelQuery,
  selectedGenres: string[],
  tagName?: string,
) {
  if (selectedGenres.length) return `นิยาย${selectedGenres.join(" · ")}`;
  if (tagName) return `นิยายแท็ก ${displayTagName(tagName)}`;
  if (query.status === "completed") return "นิยายจบแล้ว";
  if (query.sort === "new") return "นิยายมาใหม่";
  if (query.content === "free") return "นิยายอ่านฟรี";
  return "คลังนิยายออนไลน์";
}

/** Only stable, high-intent landing pages should compete in Search. */
function isIndexableBrowse(query: NovelQuery) {
  const filterKeys = Object.keys(query).filter((key) => key !== "page");
  if (filterKeys.length === 0) return true;
  if (filterKeys.length !== 1) return false;
  return query.status === "completed" || query.sort === "new" || query.content === "free";
}

async function CachedExplorePage() {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.discovery);
  cacheTag("public-novels", "public-rankings", "public-taxonomy");

  const [result, trending, newThisWeek, completed, genreShowcase] = await Promise.all([
    getCanonicalNovelPage("{}"),
    getRankings("WEEKLY", 10),
    getNewThisWeek(12),
    getCompletedNovels(12),
    getGenreShowcase(8),
  ]);
  const popular = result.items.slice(0, 14);
  const visibleNovels = [...new Map(
    [...popular, ...trending, ...newThisWeek, ...completed]
      .map((novel) => [novel.slug, novel] as const),
  ).values()];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "อ่านนิยายออนไลน์และนิยายแปลไทย",
          url: absoluteUrl("/novels"),
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: result.total,
            itemListElement: visibleNovels.map((novel, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: novel.thaiTitle,
              url: absoluteUrl(`/novel/${novel.slug}`),
            })),
          },
        }}
      />
      <ExploreFeed
        total={result.total}
        popular={popular}
        trending={trending}
        newThisWeek={newThisWeek}
        completed={completed}
        genreShowcase={genreShowcase}
      />
    </>
  );
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const raw = await searchParams;
  const { query, allGenres, activeTag } = await getCanonicalBrowseRequest(JSON.stringify(raw));
  if (Object.keys(query).length === 0) {
    return pageMetadata({
      title: "อ่านนิยายออนไลน์และนิยายแปลไทย",
      description: "สำรวจคลังนิยายออนไลน์และนิยายแปลไทย เลือกอ่านตามแนว สถานะ คะแนน จำนวนตอน และเวลาที่อัปเดต",
      path: "/novels",
    });
  }
  const result = await getCanonicalNovelPage(JSON.stringify(query));
  const canonicalQuery = resolvedPageQuery(query, result.page);
  const selected = parseGenreParam(query.genre)
    .map((slug) => allGenres.find((genre) => genre.slug === slug)?.thaiName)
    .filter((value): value is string => Boolean(value));
  const heading = browseHeading(query, selected, activeTag?.name);
  const title = `${heading}${result.page > 1 ? ` หน้า ${result.page}` : ""}`;

  return pageMetadata({
    title,
    description: `${heading}บน NiyaiThai พบ ${result.total.toLocaleString("th-TH")} เรื่อง เลือกอ่านตามแนว สถานะ คะแนน จำนวนตอน และเวลาอัปเดต`,
    path: novelBrowseHref(canonicalQuery, allGenres.map((genre) => genre.slug)),
    noIndex: !isIndexableBrowse(canonicalQuery),
  });
}

export default async function NovelsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const { query, allGenres, activeTag } = await getCanonicalBrowseRequest(JSON.stringify(raw));
  const activeGenreSlugs = allGenres.map((genre) => genre.slug);
  const normalizedHref = novelBrowseHref(query, activeGenreSlugs);
  if (Object.keys(query).length === 0) {
    if (rawSearchParamsHref("/novels", raw) !== normalizedHref) redirect(normalizedHref);
    return <CachedExplorePage />;
  }

  const [result, facets, suggestions] = await Promise.all([
    getCanonicalNovelPage(JSON.stringify(query)),
    getGenreFacets({ ...query, page: undefined }),
    getRankings("WEEKLY", 6),
  ]);
  const canonicalQuery = resolvedPageQuery(query, result.page);
  const canonicalHref = novelBrowseHref(canonicalQuery, activeGenreSlugs);
  if (rawSearchParamsHref("/novels", raw) !== canonicalHref) redirect(canonicalHref);
  const selected = parseGenreParam(canonicalQuery.genre)
    .map((slug) => allGenres.find((genre) => genre.slug === slug)?.thaiName)
    .filter((value): value is string => Boolean(value));
  const title = browseHeading(canonicalQuery, selected, activeTag?.name);

  return (
    <main id="main" className="mx-auto w-full max-w-(--shell-max) px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-5 lg:pb-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          numberOfItems: result.total,
          itemListElement: result.items.map((novel, index) => ({
            "@type": "ListItem",
            position: (result.page - 1) * result.pageSize + index + 1,
            name: novel.thaiTitle,
            url: absoluteUrl(`/novel/${novel.slug}`),
          })),
        }}
      />
      <NovelBrowser
        query={canonicalQuery}
        pagination={{ page: result.page, total: result.total, totalPages: result.totalPages, pageSize: result.pageSize }}
        facets={facets}
        results={<NovelGrid novels={result.items} />}
        emptySuggestions={<NovelGrid novels={suggestions} />}
        hasResults={result.items.length > 0}
        hasSuggestions={suggestions.length > 0}
        resultCount={result.items.length}
        title={title}
        description={selected.length ? `${result.total.toLocaleString("th-TH")} เรื่องในแนวที่เลือก` : "เลือกจากสถานะ คะแนน จำนวนตอน และเวลาอัปเดตได้ในที่เดียว"}
      />
    </main>
  );
}
