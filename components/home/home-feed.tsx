"use client";

import Link from "next/link";
import { BellRing, BookMarked, LibraryBig, Play } from "lucide-react";
import { ContentRow, RowItem } from "@/components/home/content-row";
import { GenrePicker } from "@/components/home/genre-picker";
import { UpdateFeed } from "@/components/home/update-feed";
import { NovelCard, NovelListItem, RankingCard } from "@/components/novels/novel-card";
import type { Genre, Novel, UpdateItem } from "@/types/novel";
import type { HomePersonalization } from "@/services/user-service";

export type HomeData = {
  featured: Novel[];
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

/**
 * หน้าแรก (ส่วนที่ 6.3)
 * ลำดับ section ต่างกันตามสถานะผู้ใช้ — สำคัญมาก
 *
 * Server ส่ง personalization เฉพาะเมื่อ session และสถานะผู้ใช้ในฐานข้อมูล
 * ผ่านการตรวจแล้ว จึงไม่มีการสลับ state จำลองหลัง hydrate
 */
export function HomeFeed({ data, hero, banners }: { data: HomeData; hero: React.ReactNode; banners?: React.ReactNode }) {
  const showReturningLayout = Boolean(data.personalization);
  const continueItems = data.personalization?.continueReading.slice(0, 5) ?? [];
  const followedSlugs = data.personalization?.followedNovelSlugs ?? [];
  const followedUpdates = data.followedUpdates.slice(0, 8);

  /* ---------------- section ย่อย ---------------- */

  const continueReading = (
    <ContentRow
      title="อ่านต่อ"
      description="กลับไปที่ตอนที่คุณค้างไว้ได้ในแตะเดียว"
      href="/library/reading"
      key="continue"
    >
      {continueItems.map((item) => {
        const novel = item.novel;
        const record = {
          chapter: item.chapter?.number ?? 1,
          progress: Math.round(item.progressPercent ?? 0),
        };
        return (
        <RowItem key={novel.slug}>
          <div className="w-[260px] sm:w-[300px]">
            <NovelListItem
              novel={novel}
              href={`/novel/${novel.slug}/chapter/${record.chapter}`}
              chapterLabel={`ตอนที่ ${record.chapter}`}
              meta={`อ่านไป ${record.progress}%`}
              progress={record.progress}
              action={
                <span className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[image:var(--grad-primary)] px-3 text-xs font-semibold text-white">
                  <Play className="h-3.5 w-3.5 fill-current" />
                  อ่านต่อ
                </span>
              }
            />
          </div>
        </RowItem>
        );
      })}
    </ContentRow>
  );

  const followedUpdatesSection = (
    <UpdateFeed
      key="followed"
      title="ตอนใหม่จากเรื่องที่ติดตาม"
      description="เฉพาะเรื่องที่คุณกดติดตามไว้"
      href="/updates"
      items={followedUpdates}
      novelsBySlug={data.novelsBySlug}
      emptyText={followedSlugs.length > 0 ? "ยังไม่มีตอนใหม่จากเรื่องที่ติดตาม" : "ยังไม่ได้ติดตามเรื่องไหน กดติดตามแล้วตอนใหม่จะมาโผล่ตรงนี้"}
    />
  );

  const latestUpdates = (
    <UpdateFeed
      key="latest"
      title="อัปเดตล่าสุด"
      description="ตอนใหม่จากทุกเรื่องบน NiyaiNow"
      href="/updates"
      items={data.updates.slice(0, 10)}
      novelsBySlug={data.novelsBySlug}
    />
  );

  const recommended = (
    <ContentRow
      key="recommended"
      title={showReturningLayout ? "เรื่องน่าอ่าน" : "คะแนนสูงสุด"}
      description={showReturningLayout ? "เรียงจากคะแนนของนักอ่านในชุมชน" : "เรื่องที่นักอ่านให้คะแนนสูงที่สุด"}
      href="/novels?sort=rating"
    >
      {data.recommended.map((novel) => (
        <RowItem key={novel.slug}>
          <NovelCard novel={novel} />
        </RowItem>
      ))}
    </ContentRow>
  );

  const newThisWeek = (
    <ContentRow key="new" title="มาใหม่สัปดาห์นี้" description="เรื่องที่เพิ่งเปิดแปล อ่านทันตั้งแต่ตอนแรก" href="/novels?sort=new">
      {data.newThisWeek.map((novel) => (
        <RowItem key={novel.slug}>
          <NovelCard novel={novel} />
        </RowItem>
      ))}
    </ContentRow>
  );

  const ranking = (
    <ContentRow
      key="ranking"
      title={showReturningLayout ? "จัดอันดับสัปดาห์นี้" : "จัดอันดับ"}
      description="เรื่องที่ถูกเปิดอ่านมากที่สุดตอนนี้"
      href="/rankings"
    >
      {data.rankings.slice(0, 10).map((novel, index) => (
        <RowItem key={novel.slug}>
          <RankingCard novel={novel} rank={index + 1} />
        </RowItem>
      ))}
    </ContentRow>
  );

  const genres = <GenrePicker key="genres" items={data.genreShowcase} />;

  const completed = (
    <ContentRow
      key="completed"
      title="นิยายจบแล้ว อ่านรวดเดียวจบ"
      description="ไม่ต้องรอตอนใหม่ อ่านยาวได้ถึงตอนจบ"
      href="/novels?status=completed"
    >
      {data.completed.map((novel) => (
        <RowItem key={novel.slug}>
          <NovelCard novel={novel} />
        </RowItem>
      ))}
    </ContentRow>
  );

  /* Section แนะนำการสมัคร — inline card ไม่ใช่ popup (ส่วนที่ 6.10 / ส่วนที่ 11) */
  const signupPitch = (
    <section
      key="signup"
      aria-label="เหตุผลที่ควรสมัครสมาชิก"
      className="overflow-hidden rounded-[24px] border border-border bg-card p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold sm:text-xl">สมัครฟรี แล้วอ่านต่อได้ทุกเครื่อง</h2>
      <p className="mt-1 text-sm text-muted-foreground">อ่านฟรีได้อยู่แล้วโดยไม่ต้องสมัคร — สมัครเมื่อคุณอยากเก็บความคืบหน้าไว้</p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { icon: BookMarked, title: "บันทึกตำแหน่งอ่าน", text: "อ่านค้างบนมือถือ ต่อบนคอมได้ทันที" },
          { icon: BellRing, title: "อัปเดตเรื่องที่ติดตาม", text: "ดูตอนใหม่จากเรื่องที่ติดตามได้บนหน้าแรก" },
          { icon: LibraryBig, title: "ชั้นหนังสือของตัวเอง", text: "จัดเรื่องที่ชอบไว้ที่เดียว" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{item.text}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/register"
          prefetch
          className="flex h-12 items-center rounded-[12px] bg-[image:var(--grad-primary)] px-6 text-sm font-semibold text-white shadow-[var(--sh-brand)]"
        >
          สมัครฟรี
        </Link>
        <Link
          href="/login"
          prefetch
          className="flex h-12 items-center rounded-[12px] border border-border px-6 text-sm font-semibold hover:bg-muted"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    </section>
  );

  /* ---------------- ลำดับ section ---------------- */
  // ผู้ใช้ที่ login แล้ว: "อ่านต่อ" อยู่บนสุด ไม่มี hero (ส่วนที่ 6.3)
  const sections = showReturningLayout
    ? [
        banners ? <div key="banners">{banners}</div> : null,
        continueItems.length > 0 ? continueReading : null,
        followedUpdatesSection,
        latestUpdates,
        recommended,
        ranking,
        genres,
        completed
      ]
    // มีแบนเนอร์จากหลังบ้านเมื่อไร ให้แทน hero มาตรฐานไปเลย ไม่ซ้อนสองชั้น
    : [<div key="hero">{banners ?? hero}</div>, newThisWeek, ranking, genres, latestUpdates, recommended, completed, signupPitch];

  // 40px mobile / 56px desktop — กระชับกว่าสเปก (48/64) หนึ่งขั้น
  // เพราะแถวเลื่อนแนวนอนมีข้อความใต้การ์ดสั้น ช่องว่างจึงดูกว้างกว่าค่าจริง
  return <div className="flex flex-col gap-10 lg:gap-14">{sections.filter(Boolean)}</div>;
}
