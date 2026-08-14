import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SearchResults } from "@/components/interactive/search-results";
import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { searchNovels } from "@/services/novel-service";
import { parsePositivePage } from "@/types/novel-query";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  return pageMetadata({
    title: query ? `ค้นหา “${query}”` : "ค้นหา",
    description: query ? `ผลการค้นหานิยาย ผู้แต่ง หมวดหมู่ และแท็กสำหรับ “${query}”` : "ค้นหานิยายบน NiyaiNow",
    path: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page } = await searchParams;
  const query = q.trim().slice(0, 100);
  const requestedPage = parsePositivePage(page);
  const results = await searchNovels(query, requestedPage);
  if (requestedPage !== results.page) {
    const canonicalParams = new URLSearchParams({ q: query });
    if (results.page > 1) canonicalParams.set("page", String(results.page));
    redirect(`/search?${canonicalParams.toString()}`);
  }
  return (
    <PageShell>
      {query.length >= 2 && results.novels.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `ผลการค้นหา ${query}`,
            numberOfItems: results.total,
            itemListElement: results.novels.map((novel, index) => ({
              "@type": "ListItem",
              position: (results.page - 1) * 18 + index + 1,
              name: novel.thaiTitle,
              url: absoluteUrl(`/novel/${novel.slug}`),
            })),
          }}
        />
      ) : null}
      <SearchResults key={`${query}:${results.page}`} initialQ={query} results={results} />
    </PageShell>
  );
}
