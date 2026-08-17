import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ExploreFeed } from "@/components/browse/explore-feed";
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
import {
  getCompletedNovels,
  getGenreFacets,
  getGenres,
  getGenreShowcase,
  getNewThisWeek,
  getNovelPage,
  getNovels,
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
  const title = selected.length ? `นิยาย${selected.join(" · ")}` : "สำรวจนิยาย";

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

  if (Object.keys(canonicalQuery).length === 0) {
    const [trending, newThisWeek, completed, genreShowcase] = await Promise.all([
      getRankings("WEEKLY", 10),
      getNewThisWeek(12),
      getCompletedNovels(12),
      getGenreShowcase(10),
    ]);
    const shelfGenres = genreShowcase.filter(({ genre }) => genre.count > 0).slice(0, 3);
    const popularByGenre = await Promise.all(
      shelfGenres.map(async ({ genre }) => ({
        genre,
        novels: await getNovels({ genre: genre.slug, sort: "popular" }, 6),
      })),
    );
    const visibleNovels = [...new Map(
      [
        ...trending,
        ...newThisWeek,
        ...completed,
        ...popularByGenre.flatMap((shelf) => shelf.novels),
      ].map((novel) => [novel.slug, novel] as const),
    ).values()];

    return (
      <>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "สำรวจนิยาย",
            numberOfItems: result.total,
            itemListElement: visibleNovels.map((novel, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: novel.thaiTitle,
              url: absoluteUrl(`/novel/${novel.slug}`),
            })),
          }}
        />
        <ExploreFeed
          total={result.total}
          trending={trending}
          newThisWeek={newThisWeek}
          completed={completed}
          genreShowcase={genreShowcase}
          popularByGenre={popularByGenre}
        />
      </>
    );
  }

  const [facets, suggestions] = await Promise.all([
    getGenreFacets({ ...query, page: undefined }),
    getRankings("WEEKLY", 6),
  ]);
  const selected = parseGenreParam(canonicalQuery.genre)
    .map((slug) => allGenres.find((genre) => genre.slug === slug)?.thaiName)
    .filter((value): value is string => Boolean(value));
  const title = selected.length ? `นิยาย${selected.join(" · ")}` : "สำรวจนิยาย";

  return (
    <main id="main" className="mx-auto w-full max-w-(--shell-max) px-3 py-3 sm:px-4 lg:px-5">
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
      <nav aria-label="ทางลัดสำรวจนิยาย" className="mb-8 border-y border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold tracking-[.12em] text-muted-foreground">เริ่มสำรวจ</span>
          <Link href="/novels?updated=today&sort=updated" className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm hover:border-[var(--brand-emphasis)]">อัปเดตวันนี้</Link>
          <Link href="/novels?status=completed&sort=rating" className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm hover:border-[var(--brand-emphasis)]">เรื่องจบแล้ว</Link>
          <Link href="/novels?sort=new" className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm hover:border-[var(--brand-emphasis)]">เพิ่งเผยแพร่</Link>
          {allGenres.slice(0, 5).map((genre) => (
            <Link key={genre.slug} href={`/genre/${genre.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm hover:border-[var(--brand-emphasis)]">{genre.thaiName}</Link>
          ))}
        </div>
      </nav>
      <NovelBrowser
        query={canonicalQuery}
        pagination={{ page: result.page, total: result.total, totalPages: result.totalPages }}
        facets={facets}
        results={<NovelGrid novels={result.items} />}
        emptySuggestions={<NovelGrid novels={suggestions} />}
        hasResults={result.items.length > 0}
        hasSuggestions={suggestions.length > 0}
        title={title}
        description={selected.length ? `${result.total.toLocaleString("th-TH")} เรื่องในแนวที่เลือก` : "เลือกจากสถานะ คะแนน จำนวนตอน และเวลาอัปเดตได้ในที่เดียว"}
      />
    </main>
  );
}
