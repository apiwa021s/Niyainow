"use client";

import Link from "next/link";
import { ArrowRight, BellRing, BookMarked, LibraryBig, Play } from "lucide-react";

import { ContentRow, RowItem } from "@/components/home/content-row";
import { GenrePicker } from "@/components/home/genre-picker";
import { PromoBanners } from "@/components/home/promo-banners";
import { UpdateFeed } from "@/components/home/update-feed";
import { NovelCard, NovelHorizontalCard, NovelListItem, NovelRankingItem } from "@/components/novels/novel-card";
import type { HomePersonalization } from "@/services/user-service";
import type { PromoBannerItem } from "@/services/novel-service";
import type { Genre, Novel, UpdateItem } from "@/types/novel";

export type HomeData = {
  newThisWeek: Novel[];
  recommended: Novel[];
  rankings: Novel[];
  completed: Novel[];
  updates: UpdateItem[];
  followedUpdates: UpdateItem[];
  genreShowcase: { genre: Genre; covers: string[] }[];
  novelsBySlug: Record<string, Novel>;
  personalization?: HomePersonalization;
};

function EditorialHeading({ kicker, title, description, href }: { kicker: string; title: string; description?: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className="mt-1 h-10 w-0.5 shrink-0 bg-[var(--brand-primary)]" />
        <div>
          <p className="editorial-kicker">{kicker}</p>
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {href ? <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-[var(--brand-primary)]">ดูทั้งหมด<ArrowRight className="h-4 w-4" /></Link> : null}
    </div>
  );
}

export function HomeFeed({ data, banners }: { data: HomeData; banners: PromoBannerItem[] }) {
  const returning = Boolean(data.personalization);
  const continueItems = data.personalization?.continueReading.slice(0, 5) ?? [];
  const followedSlugs = data.personalization?.followedNovelSlugs ?? [];

  const continueReading = continueItems.length ? (
    <ContentRow title="อ่านต่อ" description="กลับเข้าสู่เรื่องเดิมโดยไม่เสียจังหวะ" href="/library/reading">
      {continueItems.map((item) => {
        const chapter = item.chapter?.number ?? 1;
        const progress = Math.round(item.progressPercent ?? 0);
        return (
          <RowItem key={item.novel.slug}>
            <div className="w-[280px] sm:w-[340px]">
              <NovelListItem
                novel={item.novel}
                href={`/novel/${item.novel.slug}/chapter/${chapter}`}
                chapterLabel={`ตอนที่ ${chapter}`}
                meta={`อ่านไป ${progress}%`}
                progress={progress}
                action={<span className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[var(--brand-primary)] px-3 text-xs font-semibold text-white"><Play className="h-3.5 w-3.5 fill-current" />อ่านต่อ</span>}
              />
            </div>
          </RowItem>
        );
      })}
    </ContentRow>
  ) : null;

  const personalizedUpdates = returning ? (
    <UpdateFeed
      title="ตอนใหม่จากเรื่องที่ติดตาม"
      description="อัปเดตเฉพาะชั้นหนังสือของคุณ"
      href="/updates"
      items={data.followedUpdates.slice(0, 6)}
      novelsBySlug={data.novelsBySlug}
      emptyText={followedSlugs.length ? "เรื่องที่ติดตามยังไม่มีตอนใหม่" : "เมื่อกดติดตาม ตอนใหม่จะปรากฏตรงนี้"}
    />
  ) : null;

  const latest = (
    <UpdateFeed title="อัปเดตล่าสุด" description="ตอนใหม่ที่เพิ่งวางบนชั้น" href="/updates" items={data.updates} novelsBySlug={data.novelsBySlug} />
  );

  const recommended = (
    <section>
      <EditorialHeading kicker="CURATED / 選書" title="เรื่องแนะนำ" description="คัดจากคะแนนและจังหวะการอ่านของชุมชน" href="/novels?sort=rating" />
      <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {data.recommended.slice(0, 8).map((novel) => <div key={novel.slug} className="snap-start"><NovelHorizontalCard novel={novel} /></div>)}
      </div>
    </section>
  );

  const ranking = (
    <section>
      <EditorialHeading kicker="RANKING / 番付" title="อันดับประจำสัปดาห์" description="ตัวเลขใหญ่ เล่าเรื่องความนิยมโดยไม่ต้องใช้เหรียญรางวัล" href="/rankings" />
      <nav aria-label="ช่วงเวลาอันดับ" className="mb-4 flex gap-1 border-b border-border">
        {[['รายวัน', 'daily'], ['รายสัปดาห์', 'weekly'], ['รายเดือน', 'monthly'], ['ตลอดกาล', 'all-time']].map(([label, value]) => (
          <Link key={value} href={value === 'weekly' ? '/rankings' : `/rankings?period=${value}`} className={`min-h-11 px-3 py-2 text-sm font-medium ${value === 'weekly' ? 'border-b-2 border-[var(--brand-primary)] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{label}</Link>
        ))}
      </nav>
      <div className="grid border-t border-border lg:grid-cols-2 lg:gap-x-8">
        {data.rankings.slice(0, 10).map((novel, index) => <NovelRankingItem key={novel.slug} novel={novel} rank={index + 1} />)}
      </div>
    </section>
  );

  const discovery = (
    <section>
      <EditorialHeading kicker={returning ? "ONE MORE STORY" : "NEW THIS WEEK"} title={returning ? "เรื่องต่อไปบนชั้น" : "มาใหม่สัปดาห์นี้"} description="ปกใหม่ เรื่องใหม่ และโลกใบใหม่" href="/novels?sort=new" />
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-5">
        {(returning ? data.completed : data.newThisWeek).slice(0, 6).map((novel) => <li key={novel.slug}><NovelCard novel={novel} fluid /></li>)}
      </ul>
    </section>
  );

  const signup = !returning ? (
    <section className="grid gap-6 rounded-[8px] border border-border bg-card p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <p className="editorial-kicker">YOUR BOOKSHELF</p>
        <h2 className="mt-1 font-serif text-2xl font-semibold">สมัครฟรี แล้วอ่านต่อได้ทุกเครื่อง</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {[{ icon: BookMarked, title: "บันทึกตำแหน่งอ่าน" }, { icon: BellRing, title: "ติดตามตอนใหม่" }, { icon: LibraryBig, title: "ชั้นหนังสือส่วนตัว" }].map((item) => {
            const Icon = item.icon;
            return <li key={item.title} className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-[var(--brand-primary)]" />{item.title}</li>;
          })}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2"><Link href="/login" className="inline-flex h-12 items-center rounded-[8px] bg-[var(--brand-primary)] px-6 font-semibold text-white">เข้าสู่ระบบด้วย Google</Link></div>
    </section>
  ) : null;

  return (
    <div className="flex flex-col gap-14 lg:gap-20">
      {banners.length ? <PromoBanners banners={banners} /> : null}
      {continueReading}
      {personalizedUpdates}
      {latest}
      {recommended}
      {ranking}
      <GenrePicker items={data.genreShowcase} />
      {discovery}
      {signup}
    </div>
  );
}
