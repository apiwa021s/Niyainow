import { PUBLIC_CACHE_TTL } from "@/lib/cache/public-cache-profiles";
import { absoluteUrl } from "@/lib/site-config";
import { getSitemapCounts, getSitemapPartition } from "@/services/novel-service";


const staticRoutes = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/novels", changeFrequency: "daily", priority: 0.9 },
  { path: "/updates", changeFrequency: "hourly", priority: 0.8 },
  { path: "/rankings", changeFrequency: "daily", priority: 0.8 },
  { path: "/genres", changeFrequency: "weekly", priority: 0.7 },
  { path: "/tags", changeFrequency: "weekly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.4 },
  { path: "/copyright", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
] as const;

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/gu, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  })[character] ?? character);
}

function urlEntry(input: {
  url: string;
  lastModified?: string;
  changeFrequency?: string;
  priority?: number;
  image?: string;
}) {
  return [
    "<url>",
    `<loc>${escapeXml(input.url)}</loc>`,
    input.lastModified ? `<lastmod>${escapeXml(input.lastModified)}</lastmod>` : "",
    input.changeFrequency ? `<changefreq>${input.changeFrequency}</changefreq>` : "",
    input.priority !== undefined ? `<priority>${input.priority}</priority>` : "",
    input.image ? `<image:image><image:loc>${escapeXml(input.image)}</image:loc></image:image>` : "",
    "</url>",
  ].join("");
}

export async function GET(_request: Request, context: { params: Promise<{ partition: string }> }) {
  const rawPartition = (await context.params).partition.replace(/\.xml$/u, "");
  const partition = Number(rawPartition);
  const counts = await getSitemapCounts();
  if (!Number.isSafeInteger(partition) || partition < 0 || partition >= counts.partitions) {
    return new Response("Not Found", { status: 404 });
  }

  const entries = await getSitemapPartition(partition);
  const urls = [
    ...(partition === 0
      ? staticRoutes.map((route) => urlEntry({
          url: absoluteUrl(route.path),
          changeFrequency: route.changeFrequency,
          priority: route.priority,
        }))
      : []),
    ...entries.genres.map((genre) => urlEntry({
      url: absoluteUrl(`/genre/${genre.slug}`),
      lastModified: genre.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...entries.tags.map((tag) => urlEntry({
      url: absoluteUrl(`/tag/${tag.slug}`),
      lastModified: tag.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    })),
    // A novel emits both its detail page and its chapter index. Even in a
    // novel-only partition this remains below the protocol limit of 50k URLs.
    ...entries.novels.flatMap((novel) => [
      urlEntry({
        url: absoluteUrl(`/novel/${novel.slug}`),
        lastModified: novel.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        image: novel.cover ? absoluteUrl(novel.cover) : undefined,
      }),
      urlEntry({
        url: absoluteUrl(`/novel/${novel.slug}/chapters`),
        lastModified: novel.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ]),
    ...entries.chapters.map((chapter) => urlEntry({
      url: absoluteUrl(`/novel/${chapter.novelSlug}/chapter/${chapter.chapterNumber}`),
      lastModified: chapter.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ].join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}</urlset>`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${PUBLIC_CACHE_TTL.sitemap}, stale-while-revalidate=${PUBLIC_CACHE_TTL.sitemapStale}`,
    },
  });
}
