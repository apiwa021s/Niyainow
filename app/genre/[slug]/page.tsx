import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NovelBrowser } from "@/components/interactive/novel-browser";
import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getGenreBySlug, getGenreFacets, getNovelPage, getRankings } from "@/services/novel-service";
import type { NovelQuery } from "@/types/novel-query";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<NovelQuery>;
}) {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const genre = await getGenreBySlug(slug);
  if (!genre) notFound();
  const query: NovelQuery = { ...filters, genre: slug };
  const [result, facets, suggestions] = await Promise.all([
    getNovelPage(query),
    getGenreFacets(query),
    getRankings("WEEKLY", 6),
  ]);

  return (
    <PageShell className="space-y-6">
      <JsonLd
        data={{
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
        }}
      />
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-[var(--brand-accent)]">หมวดหมู่</p>
        <h1 className="mt-2 text-3xl font-semibold">นิยาย{genre.thaiName}</h1>
        {genre.description ? <p className="mt-2 text-muted-foreground">{genre.description}</p> : null}
        <p className="mt-4 text-sm text-muted-foreground">{genre.count.toLocaleString("th-TH")} เรื่อง</p>
      </div>
      <NovelBrowser query={query} result={result} facets={facets} suggestions={suggestions} title={`นิยาย${genre.thaiName}`} />
    </PageShell>
  );
}
