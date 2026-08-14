import { absoluteUrl } from "@/lib/site-config";
import { getSitemapCounts } from "@/services/novel-service";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/gu, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  })[character] ?? character);
}

/** Runtime sitemap index: partition discovery never requires a database during build. */
export async function GET() {
  const { partitions } = await getSitemapCounts();
  const entries = Array.from({ length: partitions }, (_, partition) => (
    `<sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/${partition}.xml`))}</loc></sitemap>`
  )).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
