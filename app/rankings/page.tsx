import type { Metadata } from "next";
import { NovelCard, NovelRankingItem } from "@/components/novels/novel-card";
import { Button } from "@/components/ui/button";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { getRankings } from "@/services/novel-service";

export const metadata: Metadata = { title: "อันดับนิยาย" };

export default function RankingsPage() {
  const novels = getRankings();
  return (
    <PageShell className="space-y-6">
      <SectionHeader title="อันดับนิยาย" />
      <div className="flex gap-2 overflow-x-auto">
        {["รายวัน", "รายสัปดาห์", "รายเดือน", "ตลอดกาล"].map((item, index) => <Button key={item} variant={index === 1 ? "default" : "secondary"}>{item}</Button>)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {novels.slice(0, 3).map((novel) => <NovelCard key={novel.slug} novel={novel} />)}
      </div>
      <div className="grid gap-3">
        {novels.slice(3, 50).map((novel, index) => <NovelRankingItem key={novel.slug} novel={novel} rank={index + 4} />)}
      </div>
    </PageShell>
  );
}
