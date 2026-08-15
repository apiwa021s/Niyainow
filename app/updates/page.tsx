import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UpdateList } from "@/components/novels/update-list";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import {
  canonicalizeUpdatesSearchParams,
  rawSearchParamsHref,
  updatesHref,
  type RawSearchParams,
  type UpdateRange,
} from "@/lib/validation/public-query";
import { getGenres, getUpdates } from "@/services/novel-service";

export const dynamic = "force-dynamic";

async function resolveUpdatesRequest(raw: RawSearchParams) {
  const genres = await getGenres(200);
  const normalized = canonicalizeUpdatesSearchParams(raw, genres.map((genre) => genre.slug));
  return { ...normalized, genres };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const { href } = await resolveUpdatesRequest(await searchParams);
  return pageMetadata({
    title: "อัปเดตนิยายล่าสุด",
    description: "ติดตามตอนใหม่จากนิยายที่เผยแพร่ล่าสุดบน NiyaiThai",
    path: href,
  });
}

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const { query, href, genres } = await resolveUpdatesRequest(raw);
  if (rawSearchParamsHref("/updates", raw) !== href) redirect(href);

  const { range, genre } = query;
  const items = await getUpdates(range, genre, 50);
  const activeGenreSlugs = genres.map((item) => item.slug);
  const ranges: { value: UpdateRange; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "today", label: "วันนี้" },
    { value: "yesterday", label: "เมื่อวาน" },
    { value: "week", label: "สัปดาห์นี้" },
  ];

  return (
    <PageShell className="space-y-5">
      <PageHeader title="อัปเดตล่าสุด" description="ตอนใหม่จากทุกเรื่อง เรียงให้สแกนได้เร็วและกลับเข้าเรื่องได้ทันที" />
      <div className="flex gap-2 overflow-x-auto">
        {ranges.map((option) => (
          <ButtonLink
            key={option.value}
            href={updatesHref({ range: option.value, genre }, activeGenreSlugs)}
            variant={range === option.value ? "default" : "outline"}
          >
            {option.label}
          </ButtonLink>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        {items.length > 0 ? <UpdateList items={items} /> : <EmptyState title="ยังไม่มีตอนใหม่" description="ลองเปลี่ยนช่วงเวลาหรือแนวนิยาย" />}
        <aside className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">เลือกแนว</h2>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={updatesHref({ range }, activeGenreSlugs)} variant={!genre ? "secondary" : "ghost"} size="sm">ทั้งหมด</ButtonLink>
            {genres.slice(0, 12).map((genreOption) => (
              <ButtonLink
                key={genreOption.slug}
                href={updatesHref({ range, genre: genreOption.slug }, activeGenreSlugs)}
                variant={genre === genreOption.slug ? "secondary" : "ghost"}
                size="sm"
              >
                {genreOption.thaiName}
              </ButtonLink>
            ))}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
