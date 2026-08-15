import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NovelBrowser } from "@/components/interactive/novel-browser";
import { NovelGrid } from "@/components/novels/novel-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getGenreFacets, getNovelPage, getRankings, getTagBySlug } from "@/services/novel-service";
import type { NovelQuery } from "@/types/novel-query";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return pageMetadata({ title: "ไม่พบแท็ก", description: "ไม่พบแท็กนี้", path: `/tag/${slug}`, noIndex: true });
  return pageMetadata({
    title: `นิยายแท็ก ${tag.name}`,
    description: tag.description || `รวมนิยายที่ติดแท็ก ${tag.name}`,
    path: `/tag/${tag.slug}`,
  });
}

export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<NovelQuery>;
}) {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();
  const query: NovelQuery = { ...filters, tag: tag.slug };
  const [result, facets, suggestions] = await Promise.all([
    getNovelPage(query),
    getGenreFacets(query),
    getRankings("WEEKLY", 6),
  ]);
  const title = `แท็ก: ${tag.name}`;
  return (
    <PageShell className="space-y-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description: tag.description,
          url: absoluteUrl(`/tag/${tag.slug}`),
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
        }}
      />
      {tag.description ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-[var(--brand-accent)]">แท็ก</p>
          <h1 className="mt-2 text-3xl font-semibold">#{tag.name}</h1>
          <p className="mt-2 text-muted-foreground">{tag.description}</p>
        </div>
      ) : null}
      <NovelBrowser
        query={query}
        pagination={{ page: result.page, total: result.total, totalPages: result.totalPages }}
        facets={facets}
        results={<NovelGrid novels={result.items} />}
        emptySuggestions={<NovelGrid novels={suggestions} />}
        hasResults={result.items.length > 0}
        hasSuggestions={suggestions.length > 0}
        title={title}
      />
    </PageShell>
  );
}
