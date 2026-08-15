import type { Metadata } from "next";

import { NovelRankingItem, RankingCard } from "@/components/novels/novel-card";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getRankings, type RankingPeriod } from "@/services/novel-service";

type PeriodParam = "daily" | "weekly" | "monthly" | "all-time";


const periods: { value: PeriodParam; label: string; db: RankingPeriod }[] = [
  { value: "daily", label: "รายวัน", db: "DAILY" },
  { value: "weekly", label: "รายสัปดาห์", db: "WEEKLY" },
  { value: "monthly", label: "รายเดือน", db: "MONTHLY" },
  { value: "all-time", label: "ตลอดกาล", db: "ALL_TIME" },
];

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ period?: string }> }): Promise<Metadata> {
  const { period: rawPeriod } = await searchParams;
  const selected = periods.find((period) => period.value === rawPeriod) ?? periods[1];
  return pageMetadata({
    title: `อันดับนิยาย${selected.label}`,
    description: `อันดับนิยายยอดนิยม${selected.label}จากข้อมูลการอ่านบน NiyaiThai`,
    path: selected.value === "weekly" ? "/rankings" : `/rankings?period=${selected.value}`,
  });
}

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: rawPeriod } = await searchParams;
  const selected = periods.find((period) => period.value === rawPeriod) ?? periods[1];
  const rankedNovels = await getRankings(selected.db, 50);

  return (
    <PageShell className="space-y-6">
      {rankedNovels.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `อันดับนิยาย${selected.label}`,
            itemListElement: rankedNovels.map((novel, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: novel.thaiTitle,
              url: absoluteUrl(`/novel/${novel.slug}`),
            })),
          }}
        />
      ) : null}
      <div>
        <p className="editorial-kicker">RANKING / 番付</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">อันดับนิยาย</h1>
        <p className="mt-2 text-sm text-muted-foreground">จัดลำดับจากพฤติกรรมการอ่านจริงบน NiyaiThai</p>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {periods.map((period) => (
          <ButtonLink
            key={period.value}
            href={period.value === "weekly" ? "/rankings" : `/rankings?period=${period.value}`}
            variant={selected.value === period.value ? "default" : "outline"}
          >
            {period.label}
          </ButtonLink>
        ))}
      </div>
      {rankedNovels.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 border-y border-border py-7 sm:grid-cols-3">
            {rankedNovels.slice(0, 3).map((novel, index) => <div key={novel.slug} className="flex justify-center"><RankingCard novel={novel} rank={index + 1} /></div>)}
          </div>
          <div className="grid gap-3">
            {rankedNovels.slice(3).map((novel, index) => <NovelRankingItem key={novel.slug} novel={novel} rank={index + 4} />)}
          </div>
        </>
      ) : (
        <EmptyState title="ยังไม่มีข้อมูลอันดับ" description="อันดับจะปรากฏเมื่อมีข้อมูลการอ่านเพียงพอ" />
      )}
    </PageShell>
  );
}
