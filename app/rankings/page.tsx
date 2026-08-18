import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";

import { RankingCard, RankingNovelCard } from "@/components/novels/novel-card";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageShell } from "@/components/ui/section";
import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getRankingEntries, type RankingPeriod } from "@/services/novel-service";

type RankingView = "trending" | "most-read" | "rising";

const views: {
  value: RankingView;
  label: string;
  description: string;
  explanation: string;
  period: RankingPeriod;
}[] = [
  {
    value: "trending",
    label: "กำลังนิยม",
    description: "แรงอ่านใน 7 วันล่าสุด",
    explanation: "เรียงจากยอดอ่าน ผู้อ่านไม่ซ้ำ การอ่านตอน และการเพิ่มเข้าคลังในช่วง 7 วันล่าสุด",
    period: "WEEKLY",
  },
  {
    value: "most-read",
    label: "อ่านมากที่สุด",
    description: "ความนิยมสะสมของคลัง",
    explanation: "เรียงจากข้อมูลการอ่านสะสมจริง เหมาะสำหรับค้นหาเรื่องหลักที่นักอ่านกลับมาอ่านต่อเนื่อง",
    period: "ALL_TIME",
  },
  {
    value: "rising",
    label: "ดาวรุ่งวันนี้",
    description: "แรงอ่านใน 24 ชั่วโมงล่าสุด",
    explanation: "ใช้กิจกรรมการอ่านของวันล่าสุด และแสดงการขยับอันดับเมื่อมี snapshot ของวันก่อนหน้าให้เปรียบเทียบ",
    period: "DAILY",
  },
];

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ view?: string }> }): Promise<Metadata> {
  const { view: rawView } = await searchParams;
  const selected = views.find((view) => view.value === rawView) ?? views[0];
  return pageMetadata({
    title: `อันดับนิยาย${selected.label}`,
    description: `${selected.label}บน NiyaiThai — ${selected.explanation}`,
    path: selected.value === "trending" ? "/rankings" : `/rankings?view=${selected.value}`,
  });
}

async function CachedRankingsPage({ view }: { view: RankingView }) {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.discovery);
  cacheTag("public-rankings", "public-novels");

  const selected = views.find((item) => item.value === view) ?? views[0];
  const entries = await getRankingEntries(selected.period, 50);

  return (
    <PageShell className="space-y-7">
      {entries.length ? (
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `อันดับนิยาย${selected.label}`,
          itemListElement: entries.map((entry) => ({
            "@type": "ListItem",
            position: entry.rank,
            name: entry.novel.thaiTitle,
            url: absoluteUrl(`/novel/${entry.novel.slug}`),
          })),
        }} />
      ) : null}

      <header className="py-2 sm:py-3">
        <p className="editorial-kicker">RANKING / READER SIGNALS</p>
        <h1 className="mt-1 text-h1 font-semibold sm:text-display">อันดับนิยาย</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{selected.explanation}</p>
      </header>

      <nav aria-label="ประเภทอันดับ" className="grid gap-1 rounded-[8px] bg-muted/35 p-1 sm:grid-cols-3">
        {views.map((view) => {
          const active = selected.value === view.value;
          return (
            <ButtonLink
              key={view.value}
              href={view.value === "trending" ? "/rankings" : `/rankings?view=${view.value}`}
              variant="ghost"
              aria-current={active ? "page" : undefined}
              className={`h-auto min-h-16 flex-col items-start rounded-[6px] px-4 py-3 text-left ${active ? "bg-card text-foreground shadow-[var(--sh-1)]" : "text-muted-foreground hover:bg-muted/55 hover:text-foreground"}`}
            >
              <span>{view.label}</span>
              <span className="text-[11px] font-normal text-muted-foreground">{view.description}</span>
            </ButtonLink>
          );
        })}
      </nav>

      {entries.length ? (
        <>
          <section aria-label="สามอันดับแรก" className="grid grid-cols-1 gap-6 pb-2 sm:grid-cols-3">
            {entries.slice(0, 3).map((entry) => (
              <div key={entry.novel.slug} className="flex justify-center">
                <RankingCard novel={entry.novel} rank={entry.rank} movement={entry.movement} />
              </div>
            ))}
          </section>
          <section aria-label={`อันดับ${selected.label}`} className="render-deferred grid lg:grid-cols-2 lg:gap-x-8">
            {entries.slice(3).map((entry) => (
              <RankingNovelCard key={entry.novel.slug} novel={entry.novel} rank={entry.rank} movement={entry.movement} />
            ))}
          </section>
        </>
      ) : (
        <EmptyState
          title="ยังไม่มีข้อมูลอันดับสำหรับช่วงนี้"
          description="อันดับจะแสดงเมื่อมีข้อมูลกิจกรรมการอ่านจริงเพียงพอ ระหว่างนี้ยังสำรวจคลังนิยายได้ตามปกติ"
          action={<ButtonLink href="/novels">สำรวจนิยาย</ButtonLink>}
        />
      )}
    </PageShell>
  );
}

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: rawView } = await searchParams;
  if (rawView === "trending" || (rawView && !views.some((view) => view.value === rawView))) redirect("/rankings");
  const selected = views.find((view) => view.value === rawView) ?? views[0];
  return <CachedRankingsPage view={selected.value} />;
}
