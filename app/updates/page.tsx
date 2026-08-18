import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { ChevronDown } from "lucide-react";
import { redirect } from "next/navigation";
import { cache } from "react";

import { UpdateList } from "@/components/novels/update-list";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageShell } from "@/components/ui/section";
import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { pageMetadata } from "@/lib/seo";
import { canonicalizeUpdatesSearchParams, rawSearchParamsHref, updatesHref, type RawSearchParams, type UpdateRange } from "@/lib/validation/public-query";
import { getGenres, getUpdates } from "@/services/novel-service";

const ranges: { value: UpdateRange; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "today", label: "วันนี้" },
  { value: "yesterday", label: "เมื่อวาน" },
  { value: "week", label: "สัปดาห์นี้" },
];

async function resolveUpdatesRequest(raw: RawSearchParams) {
  const genres = await getGenres(200);
  const normalized = canonicalizeUpdatesSearchParams(raw, genres.map((genre) => genre.slug));
  return { ...normalized, genres };
}

const getCanonicalUpdatesRequest = cache((rawKey: string) =>
  resolveUpdatesRequest(JSON.parse(rawKey) as RawSearchParams),
);

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const raw = await searchParams;
  const { href } = await getCanonicalUpdatesRequest(JSON.stringify(raw));
  return pageMetadata({ title: "อัปเดตนิยายล่าสุด", description: "ติดตามตอนใหม่จากนิยายที่เพิ่งเผยแพร่บน NiyaiThai", path: href });
}

async function CachedUpdatesPage({ range, genre }: { range: UpdateRange; genre?: string }) {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.live);
  cacheTag("public-chapters", "public-novels", "public-taxonomy");

  const [genres, items] = await Promise.all([
    getGenres(200),
    getUpdates(range, genre, 50),
  ]);
  const activeGenreSlugs = genres.map((item) => item.slug);
  const activeGenre = genres.find((item) => item.slug === genre);

  return (
    <PageShell className="space-y-6">
      <header className="border-y border-border py-5 sm:py-6">
        <p className="editorial-kicker">ตามจังหวะการเผยแพร่</p>
        <h1 className="mt-1 text-h1 font-semibold sm:text-display">อัปเดตล่าสุด</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">ตอนใหม่จากทุกเรื่อง เรียงตามเวลาที่เผยแพร่จริง</p>
      </header>

      <div className="flex flex-wrap items-start gap-2">
        <nav aria-label="ช่วงเวลาอัปเดต" className="rail-scroll -mx-3 flex max-w-full gap-2 px-3 sm:mx-0 sm:px-0">
          {ranges.map((option) => <ButtonLink key={option.value} href={updatesHref({ range: option.value, genre }, activeGenreSlugs)} variant={range === option.value ? "default" : "outline"}>{option.label}</ButtonLink>)}
        </nav>
        <details className="group relative">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-[8px] border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
            {activeGenre ? activeGenre.thaiName : "ทุกแนว"}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 right-auto top-12 z-20 w-[min(calc(100vw-2rem),420px)] rounded-[8px] border border-border bg-popover p-3 shadow-[var(--sh-2)] sm:left-auto sm:right-0">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">กรองตามแนว</p>
            <div className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto">
              <ButtonLink href={updatesHref({ range }, activeGenreSlugs)} variant={!genre ? "secondary" : "ghost"} size="sm">ทุกแนว</ButtonLink>
              {genres.map((option) => <ButtonLink key={option.slug} href={updatesHref({ range, genre: option.slug }, activeGenreSlugs)} variant={genre === option.slug ? "secondary" : "ghost"} size="sm">{option.thaiName}</ButtonLink>)}
            </div>
          </div>
        </details>
      </div>

      {items.length ? <div className="render-deferred"><UpdateList items={items} /></div> : <EmptyState title="ยังไม่มีตอนใหม่ในช่วงนี้" description="ลองเปลี่ยนช่วงเวลาหรือเลือกทุกแนวเพื่อดูอัปเดตล่าสุด" action={<ButtonLink href="/updates">ดูอัปเดตทั้งหมด</ButtonLink>} />}
    </PageShell>
  );
}

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const { query, href } = await getCanonicalUpdatesRequest(JSON.stringify(raw));
  if (rawSearchParamsHref("/updates", raw) !== href) redirect(href);
  return <CachedUpdatesPage range={query.range} genre={query.genre} />;
}
