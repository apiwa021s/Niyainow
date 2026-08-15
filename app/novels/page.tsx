import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";

import { NovelBrowser } from "@/components/interactive/novel-browser";
import { NovelGrid } from "@/components/novels/novel-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import {
  canonicalizeNovelSearchParams,
  normalizeTagCandidate,
  novelBrowseHref,
  rawSearchParamsHref,
  type RawSearchParams,
} from "@/lib/validation/public-query";
import { getGenreFacets, getGenres, getNovelPage, getRankings, getTagBySlug } from "@/services/novel-service";
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
  return { ...normalized, allGenres };
}

function resolvedPageQuery(query: NovelQuery, page: number): NovelQuery {
  const resolved = { ...query };
  if (page > 1) resolved.page = page;
  else delete resolved.page;
  return resolved;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const raw = await searchParams;
  const { query, allGenres } = await resolveBrowseRequest(raw);
  const result = await getCanonicalNovelPage(JSON.stringify(query));
  const canonicalQuery = resolvedPageQuery(query, result.page);
  const selected = parseGenreParam(query.genre)
    .map((slug) => allGenres.find((genre) => genre.slug === slug)?.thaiName)
    .filter((value): value is string => Boolean(value));
  const title = selected.length ? `นิยาย${selected.join(" · ")}` : "นิยายทั้งหมด";

  return pageMetadata({
    title,
    description: `${title} บน NiyaiThai พบ ${result.total.toLocaleString("th-TH")} เรื่อง เลือกตามแนว สถานะ คะแนน และช่วงเวลาอัปเดต`,
    path: novelBrowseHref(canonicalQuery, allGenres.map((genre) => genre.slug)),
    noIndex: Boolean(query.q),
  });
}

export default async function NovelsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const { query, allGenres } = await resolveBrowseRequest(raw);
  const result = await getCanonicalNovelPage(JSON.stringify(query));
  const canonicalQuery = resolvedPageQuery(query, result.page);
  const canonicalHref = novelBrowseHref(canonicalQuery, allGenres.map((genre) => genre.slug));
  if (rawSearchParamsHref("/novels", raw) !== canonicalHref) redirect(canonicalHref);

  const [facets, suggestions] = await Promise.all([
    getGenreFacets({ ...query, page: undefined }),
    getRankings("WEEKLY", 6),
  ]);
  const selected = parseGenreParam(canonicalQuery.genre)
    .map((slug) => allGenres.find((genre) => genre.slug === slug)?.thaiName)
    .filter((value): value is string => Boolean(value));
  const title = selected.length ? `นิยาย${selected.join(" · ")}` : "นิยายทั้งหมด";

  return (
    <main id="main" className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-[88px] sm:px-6 lg:px-8">
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
        pagination={{ page: result.page, total: result.total, totalPages: result.totalPages }}
        facets={facets}
        results={<NovelGrid novels={result.items} />}
        emptySuggestions={<NovelGrid novels={suggestions} />}
        hasResults={result.items.length > 0}
        hasSuggestions={suggestions.length > 0}
        title={title}
      />
    </main>
  );
}
