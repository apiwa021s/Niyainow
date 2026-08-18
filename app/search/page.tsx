import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

import { SearchResults } from "@/components/interactive/search-results";
import { NovelGrid } from "@/components/novels/novel-grid";
import { SearchNovelCard } from "@/components/novels/novel-card";
import { SearchNovelFilters } from "@/components/search/search-novel-filters";
import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import {
  canonicalizeNovelSearchParams,
  novelBrowseHref,
  rawSearchParamsHref,
  type RawSearchParams,
} from "@/lib/validation/public-query";
import {
  getGenreFacets,
  getGenres,
  getRankings,
  getRecommendedNovels,
  getTags,
  searchNovels,
} from "@/services/novel-service";
import { parsePositivePage } from "@/types/novel-query";

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const raw = await searchParams;
  const query = scalar(raw.q).replace(/\s+/gu, " ").trim().slice(0, 100);
  return pageMetadata({
    title: query ? `ค้นหา “${query}”` : "ค้นหา",
    description: query
      ? `ผลการค้นหานิยาย ผู้แต่ง ผู้แปล หมวดหมู่ และแท็กสำหรับ “${query}”`
      : "ค้นหานิยายบน NiyaiThai",
    path: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const allGenres = await getGenres(200);
  const normalized = canonicalizeNovelSearchParams(raw, {
    activeGenreSlugs: allGenres.map((genre) => genre.slug),
  });
  const canonicalHref = `/search${normalized.href.slice("/novels".length)}`;
  if (rawSearchParamsHref("/search", raw) !== canonicalHref) redirect(canonicalHref);

  const filters = normalized.query;
  const query = String(filters.q ?? "");
  const requestedPage = parsePositivePage(filters.page);
  const [results, weeklyTrending, facets, popularTags] = await Promise.all([
    searchNovels(query, requestedPage, filters),
    query.length < 2 ? getRankings("WEEKLY", 6) : Promise.resolve([]),
    query.length >= 2 ? getGenreFacets({ ...filters, page: undefined }) : Promise.resolve([]),
    query.length < 2 ? getTags(undefined, 8) : Promise.resolve([]),
  ]);
  const discovery = query.length < 2 && weeklyTrending.length === 0
    ? await getRecommendedNovels(6)
    : weeklyTrending;
  const discoveryUsesRanking = weeklyTrending.length > 0;

  if (requestedPage !== results.page) {
    const correctedBrowseHref = novelBrowseHref(
      { ...filters, page: results.page },
      allGenres.map((genre) => genre.slug),
    );
    redirect(`/search${correctedBrowseHref.slice("/novels".length)}`);
  }

  const { novels, ...searchResults } = results;
  return (
    <PageShell>
      {query.length >= 2 && novels.length ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `ผลการค้นหา ${query}`,
            numberOfItems: results.total,
            itemListElement: novels.map((novel, index) => ({
              "@type": "ListItem",
              position: (results.page - 1) * 18 + index + 1,
              name: novel.thaiTitle,
              url: absoluteUrl(`/novel/${novel.slug}`),
            })),
          }}
        />
      ) : null}
      <SearchResults
        key={canonicalHref}
        initialQ={query}
        results={searchResults}
        novelItems={novels.map((novel) => (
          <SearchNovelCard key={novel.slug} novel={novel} highlight={query} />
        ))}
        discoveryItems={<NovelGrid novels={discovery} compact />}
        discoveryTitle={discoveryUsesRanking ? "กำลังได้รับความนิยม" : "เรื่องที่ผู้อ่านให้คะแนนสูง"}
        discoveryDescription={discoveryUsesRanking
          ? "อ้างอิงกิจกรรมการอ่านในช่วง 7 วันล่าสุด"
          : "ใช้คะแนนจริงจากผู้อ่าน เมื่อข้อมูลความนิยมรายสัปดาห์ยังไม่เพียงพอ"}
        discoveryTopics={(
          <section aria-labelledby="search-topics-title" className="py-2">
            <p className="editorial-kicker">START WITH A THREAD</p>
            <h2 id="search-topics-title" className="mt-1 text-xl font-semibold">เริ่มจากแนวหรือแท็กที่สนใจ</h2>
            <div className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {allGenres.slice(0, 6).map((genre) => (
                <Link key={genre.slug} href={`/genre/${genre.slug}`} className="group flex min-h-11 items-center justify-between border-b border-border text-sm font-medium">
                  <span>{genre.thaiName}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
              {popularTags.slice(0, 6).map((tag) => (
                <Link key={tag.slug} href={`/tag/${tag.slug}`} className="group flex min-h-11 items-center justify-between border-b border-border text-sm font-medium">
                  <span>#{tag.name}</span><span className="tabular text-xs text-muted-foreground">{tag.count.toLocaleString("th-TH")}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
        novelFilters={<SearchNovelFilters query={filters} genres={facets} total={results.total} />}
        filterQuery={filters}
      />
    </PageShell>
  );
}
