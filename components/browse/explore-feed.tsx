import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { ContentRow, RowItem } from "@/components/home/content-row";
import { GenrePicker } from "@/components/home/genre-picker";
import { NovelTile, RankingNovelCard } from "@/components/novels/novel-card";
import { EmptyState, PageShell, SectionHeader } from "@/components/ui/section";
import type { Genre, Novel } from "@/types/novel";

const EXPLORE_SHELF_ITEM_CLASS = "w-[92px] shrink-0 sm:w-[106px] lg:w-[118px] 2xl:w-[126px]";

function ShelfEmpty({ description }: { description: string }) {
  return (
    <div className="border-y border-border py-7 text-sm leading-7 text-muted-foreground">
      {description}
    </div>
  );
}

function NovelCarouselShelf({
  title,
  description,
  href,
  action,
  novels,
  emptyDescription,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  novels: Novel[];
  emptyDescription: string;
}) {
  if (!novels.length) {
    return (
      <section aria-label={title} className="render-deferred">
        <SectionHeader title={title} description={description} href={href} action={action} />
        <ShelfEmpty description={emptyDescription} />
      </section>
    );
  }

  return (
    <ContentRow title={title} description={description} href={href} action={action} bleed={false} className="render-deferred">
      {novels.map((novel) => (
        <RowItem key={novel.slug} className={EXPLORE_SHELF_ITEM_CLASS}>
          <NovelTile novel={novel} />
        </RowItem>
      ))}
    </ContentRow>
  );
}

export function ExploreFeed({
  total,
  popular,
  trending,
  newThisWeek,
  completed,
  genreShowcase,
}: {
  total: number;
  popular: Novel[];
  trending: Novel[];
  newThisWeek: Novel[];
  completed: Novel[];
  genreShowcase: { genre: Genre; covers: string[] }[];
}) {
  const hasAnyNovel = total > 0;

  return (
    <PageShell className="space-y-8 lg:space-y-10">
      <header className="grid gap-4 border-y border-border py-4 sm:py-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
        <div className="max-w-3xl">
          <p className="editorial-kicker">DISCOVERY / EXPLORE</p>
          <h1 className="mt-1 text-h1 font-semibold sm:text-display">วันนี้อยากอ่านอะไรต่อ</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            เริ่มจากเรื่องที่กำลังถูกอ่าน แนวที่ชอบ หรือจังหวะการอ่านที่ต้องการ แล้วค่อยลงลึกในคลังด้วยตัวกรอง
          </p>
          <form action="/novels" className="mt-4 grid max-w-2xl gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block min-w-0">
              <span className="sr-only">ค้นหานิยายในคลัง</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                name="q"
                type="search"
                placeholder="ค้นชื่อเรื่อง ผู้แต่ง หรือผู้แปล"
                className="h-11 w-full rounded-[6px] border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground hover:border-[var(--brand-emphasis)] focus:border-[var(--brand-emphasis)]"
              />
            </label>
            <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">
              <Search className="h-4 w-4" aria-hidden /> ค้นหา
            </button>
          </form>
        </div>
        <div className="border-l-2 border-[var(--brand-emphasis)] pl-4">
          <p className="tabular text-3xl font-semibold">{total.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-sm text-muted-foreground">เรื่องที่เปิดอ่านได้ในคลัง</p>
        </div>
      </header>

      <nav aria-label="ทางเลือกสำหรับสำรวจนิยาย">
        <p className="editorial-kicker mb-3">เลือกจุดเริ่มต้น</p>
        <ul className="rail-scroll -mx-3 flex gap-2 px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {[
            { href: "/rankings", label: "ดูอันดับผู้อ่าน", meta: "ความนิยมจากกิจกรรมจริง" },
            { href: "/genres", label: "เลือกแนวนิยาย", meta: "ค้นจากบรรยากาศของเรื่อง" },
            { href: "/novels?sort=updated", label: "เปิดคลังอัปเดตล่าสุด", meta: "เรียงจากตอนที่เพิ่งมา" },
            { href: "/novels?sort=rating", label: "เปิดคลังคะแนนสูง", meta: "ใช้ตัวกรองละเอียดต่อได้" },
          ].map((item) => (
            <li key={item.href} className="w-[238px] shrink-0 sm:w-[260px] lg:w-[276px]">
              <Link href={item.href} className="group flex min-h-20 items-center justify-between gap-3 rounded-[8px] border border-border bg-card px-3 py-3 transition-colors hover:border-[var(--brand-emphasis)] hover:bg-muted/45">
                <span className="min-w-0">
                  <span className="block font-semibold group-hover:text-[var(--brand-emphasis)]">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.meta}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-emphasis)]" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!hasAnyNovel ? (
        <EmptyState
          title="คลังยังไม่มีนิยายที่เผยแพร่"
          description="เมื่อมีเรื่องที่เปิดอ่านได้ รายการสำรวจตามความนิยม แนว และสถานะจะปรากฏที่นี่"
          />
        ) : null}

      <section aria-label="กำลังมาแรง" className="render-deferred">
        <SectionHeader
          title="กำลังมาแรง"
          description="เรียงจากกิจกรรมการอ่านในช่วง 7 วันล่าสุด ไม่ใช่รายการสุ่ม"
          href="/rankings"
          action="ดูอันดับทั้งหมด"
        />
        {trending.length > 0 ? (
          <ol className="grid border-t border-border lg:grid-cols-2 lg:gap-x-8">
            {trending.slice(0, 10).map((novel, index) => (
              <li key={novel.slug}><RankingNovelCard novel={novel} rank={index + 1} /></li>
            ))}
          </ol>
        ) : (
          <ShelfEmpty description="ยังไม่มีกิจกรรมการอ่านเพียงพอสำหรับจัดอันดับสัปดาห์นี้" />
        )}
      </section>

      {genreShowcase.length > 0 ? (
        <GenrePicker items={genreShowcase} />
      ) : (
        <section aria-label="แนวนิยาย">
          <SectionHeader title="แนวนิยาย" description="เลือกค้นจากบรรยากาศและประเภทของเรื่อง" />
          <ShelfEmpty description="ยังไม่มีแนวนิยายที่เปิดใช้งานในคลัง" />
        </section>
      )}

      <NovelCarouselShelf
        title="ยอดนิยมทั้งคลัง"
        description="รายการหลักของคลัง เรียงจากกิจกรรมการอ่านและความนิยม"
        href="/novels?sort=popular"
        action="เปิดคลังทั้งหมด"
        novels={popular}
        emptyDescription="ยังไม่มีข้อมูลเพียงพอสำหรับจัดรายการยอดนิยม"
      />

      <NovelCarouselShelf
        title="มาใหม่"
        description="เรื่องที่เริ่มเผยแพร่ภายใน 7 วันล่าสุด"
        href="/novels?sort=new"
        action="เปิดคลังมาใหม่"
        novels={newThisWeek}
        emptyDescription="ยังไม่มีเรื่องที่เริ่มเผยแพร่ในช่วง 7 วันที่ผ่านมา"
      />

      <NovelCarouselShelf
        title="จบแล้วอ่านยาว"
        description="เรื่องที่เผยแพร่ครบแล้ว เรียงจากคะแนนผู้อ่าน"
        href="/novels?status=completed&sort=rating"
        action="ดูเรื่องจบทั้งหมด"
        novels={completed}
        emptyDescription="ยังไม่มีเรื่องที่เผยแพร่ครบในคลัง"
      />
    </PageShell>
  );
}
