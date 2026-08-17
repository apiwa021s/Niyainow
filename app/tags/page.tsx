import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { EmptyState, PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { getTags, type TagSummary } from "@/services/novel-service";

type TagSearchParams = { q?: string | string[] };

function normalizedTagQuery(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<TagSearchParams> }): Promise<Metadata> {
  const { q } = await searchParams;
  const query = normalizedTagQuery(q);
  return pageMetadata({
    title: query ? `ค้นหาแท็ก “${query}”` : "แท็กยอดนิยม",
    description: "สำรวจแท็กนิยายและค้นหาองค์ประกอบของเรื่องที่สนใจ",
    path: query ? `/tags?q=${encodeURIComponent(query)}` : "/tags",
    noIndex: Boolean(query),
  });
}

function tagCountLabel(tag: TagSummary) {
  return tag.count > 0 ? `${tag.count.toLocaleString("th-TH")} เรื่อง` : "ยังไม่มีเรื่อง";
}

function TagIndex({ tags }: { tags: TagSummary[] }) {
  return (
    <ul className="grid border-t border-border md:grid-cols-2 xl:grid-cols-3">
      {tags.map((tag) => (
        <li key={tag.slug} className="border-b border-border md:odd:border-r xl:border-r xl:[&:nth-child(3n)]:border-r-0">
          <Link
            href={`/tag/${tag.slug}`}
            className="group grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3 py-3 transition-colors hover:bg-muted/45 sm:px-4"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold group-hover:text-[var(--brand-emphasis)]">#{tag.name}</span>
              {tag.description ? <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">{tag.description}</span> : null}
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular whitespace-nowrap">{tagCountLabel(tag)}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-emphasis)]" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function TagsPage({ searchParams }: { searchParams: Promise<TagSearchParams> }) {
  const { q } = await searchParams;
  const query = normalizedTagQuery(q);
  const tags = await getTags(query || undefined, 200);
  const isTagLimitReached = tags.length === 200;
  const featuredTags = query ? [] : tags.filter((tag) => tag.count > 0).slice(0, 8);
  const indexedTags = query
    ? tags
    : [...tags].sort((left, right) => left.name.localeCompare(right.name, "th"));

  return (
    <PageShell className="space-y-10 lg:space-y-14">
      <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,520px)] lg:items-end">
        <div>
          <p className="editorial-kicker">ค้นจากองค์ประกอบของเรื่อง</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">แท็กนิยาย</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">เจาะจงเส้นเรื่อง ตัวละคร หรือบรรยากาศที่อยากอ่าน แล้วเปิดดูนิยายที่ใช้แท็กนั้น</p>
        </div>
        <form action="/tags" className="flex gap-2">
          <Input
            name="q"
            defaultValue={query}
            placeholder="ค้นหาแท็ก"
            aria-label="ค้นหาแท็ก"
            maxLength={100}
            className="h-12"
          />
          <Button type="submit" size="lg"><Search className="h-4 w-4" />ค้นหา</Button>
        </form>
      </header>

      {!query ? (
        <section aria-labelledby="popular-tags-title">
          <div className="mb-4">
            <p className="editorial-kicker">POPULAR TAGS</p>
            <h2 id="popular-tags-title" className="mt-1 text-2xl font-semibold">แท็กที่พบในนิยายมากที่สุด</h2>
            <p className="mt-2 text-sm text-muted-foreground">จัดจากจำนวนนิยายที่เผยแพร่และผูกกับแต่ละแท็กจริง</p>
          </div>
          {featuredTags.length > 0 ? (
            <ol className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
              {featuredTags.map((tag, index) => (
                <li key={tag.slug} className="border-b border-border sm:odd:border-r lg:border-r lg:[&:nth-child(4n)]:border-r-0">
                  <Link href={`/tag/${tag.slug}`} className="group flex min-h-32 flex-col justify-between gap-5 p-4 transition-colors hover:bg-muted/45">
                    <span className="flex items-start justify-between gap-3">
                      <span className="tabular font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-emphasis)]" />
                    </span>
                    <span>
                      <span className="block text-lg font-semibold group-hover:text-[var(--brand-emphasis)]">#{tag.name}</span>
                      <span className="tabular mt-1 block text-xs text-muted-foreground">{tagCountLabel(tag)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="border-y border-border py-7 text-sm text-muted-foreground">ยังไม่มีแท็กที่ผูกกับนิยายเผยแพร่</div>
          )}
        </section>
      ) : null}

      <section aria-labelledby="tag-index-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="editorial-kicker">{query ? "SEARCH RESULTS" : isTagLimitReached ? "TAG INDEX" : "FULL INDEX"}</p>
            <h2 id="tag-index-title" className="mt-1 text-2xl font-semibold">
              {query ? `ผลการค้นหา “${query}”` : isTagLimitReached ? "ดัชนีแท็กในคลัง" : "ดัชนีแท็กทั้งหมด"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {query
                ? `${isTagLimitReached ? "แสดง" : "พบ"} ${tags.length.toLocaleString("th-TH")} แท็ก${isTagLimitReached ? "แรก ลองเจาะจงคำค้นเพื่อดูผลที่แคบลง" : ""}`
                : isTagLimitReached
                  ? "แสดงแท็กที่ใช้บ่อยสูงสุด 200 รายการโดยเรียงชื่อตรงนี้ และค้นหาเพื่อเจาะจงแท็กอื่น"
                  : "เรียงตามชื่อเพื่อไล่ดูได้รวดเร็ว โดยไม่ลดเหลือเพียงกลุ่มยอดนิยม"}
            </p>
          </div>
          {query ? <ButtonLink href="/tags" variant="outline">ล้างคำค้น</ButtonLink> : null}
        </div>

        {indexedTags.length > 0 ? (
          <TagIndex tags={indexedTags} />
        ) : (
          <EmptyState
            title="ไม่พบแท็ก"
            description="ลองใช้คำค้นที่สั้นลง หรือล้างคำค้นเพื่อดูแท็กทั้งหมด"
            action={<ButtonLink href="/tags">ดูแท็กทั้งหมด</ButtonLink>}
          />
        )}
      </section>
    </PageShell>
  );
}
