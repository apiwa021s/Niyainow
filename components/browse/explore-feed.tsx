import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { GenrePicker } from "@/components/home/genre-picker";
import { NovelGrid } from "@/components/novels/novel-grid";
import { RankingNovelCard } from "@/components/novels/novel-card";
import { EmptyState, PageShell, SectionHeader } from "@/components/ui/section";
import type { Genre, Novel } from "@/types/novel";

export type PopularGenreShelf = {
  genre: Genre;
  novels: Novel[];
};

function ShelfEmpty({ description }: { description: string }) {
  return (
    <div className="border-y border-border py-7 text-sm leading-7 text-muted-foreground">
      {description}
    </div>
  );
}

export function ExploreFeed({
  total,
  trending,
  newThisWeek,
  completed,
  genreShowcase,
  popularByGenre,
}: {
  total: number;
  trending: Novel[];
  newThisWeek: Novel[];
  completed: Novel[];
  genreShowcase: { genre: Genre; covers: string[] }[];
  popularByGenre: PopularGenreShelf[];
}) {
  const hasAnyNovel = total > 0;

  return (
    <PageShell className="space-y-14 lg:space-y-20">
      <header className="grid gap-6 border-y border-border py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
        <div className="max-w-3xl">
          <p className="editorial-kicker">DISCOVERY / EXPLORE</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl lg:text-5xl">วันนี้อยากอ่านอะไรต่อ</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            เริ่มจากเรื่องที่กำลังถูกอ่าน แนวที่ชอบ หรือจังหวะการอ่านที่ต้องการ แล้วค่อยลงลึกในคลังด้วยตัวกรอง
          </p>
        </div>
        <div className="border-l-2 border-[var(--brand-emphasis)] pl-4">
          <p className="tabular font-serif text-3xl font-semibold">{total.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-sm text-muted-foreground">เรื่องที่เปิดอ่านได้ในคลัง</p>
        </div>
      </header>

      <nav aria-label="ทางเลือกสำหรับสำรวจนิยาย">
        <p className="editorial-kicker mb-3">เลือกจุดเริ่มต้น</p>
        <ul className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/rankings", label: "ดูอันดับผู้อ่าน", meta: "ความนิยมจากกิจกรรมจริง" },
            { href: "/genres", label: "เลือกแนวนิยาย", meta: "ค้นจากบรรยากาศของเรื่อง" },
            { href: "/novels?sort=updated", label: "เปิดคลังอัปเดตล่าสุด", meta: "เรียงจากตอนที่เพิ่งมา" },
            { href: "/novels?sort=rating", label: "เปิดคลังคะแนนสูง", meta: "ใช้ตัวกรองละเอียดต่อได้" },
          ].map((item) => (
            <li key={item.href} className="border-b border-border sm:odd:border-r lg:border-r lg:last:border-r-0">
              <Link href={item.href} className="group flex min-h-24 items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/45">
                <span>
                  <span className="block font-serif font-semibold group-hover:text-[var(--brand-emphasis)]">{item.label}</span>
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

      <section aria-labelledby="popular-by-genre-title" className="render-deferred">
        <div className="mb-8 border-b border-border pb-5">
          <p className="editorial-kicker">POPULAR BY GENRE</p>
          <h2 id="popular-by-genre-title" className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">นิยมในแต่ละแนว</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">เทียบเรื่องยอดนิยมภายในแนวเดียวกัน เพื่อเลือกได้ตรงอารมณ์มากขึ้น</p>
        </div>
        {popularByGenre.length > 0 ? (
          <div className="space-y-12">
            {popularByGenre.map(({ genre, novels }) => (
              <article key={genre.slug} aria-labelledby={`popular-${genre.slug}`}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h3 id={`popular-${genre.slug}`} className="font-serif text-xl font-semibold">{genre.thaiName}</h3>
                    {genre.description ? <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">{genre.description}</p> : null}
                  </div>
                  <Link href={`/genre/${genre.slug}`} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)]">
                    ดูแนวนี้ <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {novels.length > 0 ? <NovelGrid novels={novels} compact /> : <ShelfEmpty description={`ยังไม่มีนิยายเผยแพร่ในแนว${genre.thaiName}`} />}
              </article>
            ))}
          </div>
        ) : (
          <ShelfEmpty description="ยังไม่มีข้อมูลเพียงพอสำหรับจัดรายการยอดนิยมแยกตามแนว" />
        )}
      </section>

      <section aria-label="มาใหม่" className="render-deferred">
        <SectionHeader
          title="มาใหม่"
          description="เรื่องที่เริ่มเผยแพร่ภายใน 7 วันล่าสุด"
          href="/novels?sort=new"
          action="เปิดคลังมาใหม่"
        />
        {newThisWeek.length > 0 ? <NovelGrid novels={newThisWeek} /> : <ShelfEmpty description="ยังไม่มีเรื่องที่เริ่มเผยแพร่ในช่วง 7 วันที่ผ่านมา" />}
      </section>

      <section aria-label="จบแล้วอ่านยาว" className="render-deferred">
        <SectionHeader
          title="จบแล้วอ่านยาว"
          description="เรื่องที่เผยแพร่ครบแล้ว เรียงจากคะแนนผู้อ่าน"
          href="/novels?status=completed&sort=rating"
          action="ดูเรื่องจบทั้งหมด"
        />
        {completed.length > 0 ? <NovelGrid novels={completed} /> : <ShelfEmpty description="ยังไม่มีเรื่องที่เผยแพร่ครบในคลัง" />}
      </section>
    </PageShell>
  );
}
