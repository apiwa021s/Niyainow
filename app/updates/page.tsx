import type { Metadata } from "next";
import { UpdateList } from "@/components/novels/update-list";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { getGenres, getUpdates } from "@/services/novel-service";

export const metadata: Metadata = { title: "อัปเดตล่าสุด" };

export default function UpdatesPage() {
  return (
    <PageShell className="space-y-5">
      <SectionHeader title="อัปเดตล่าสุด" />
      <div className="flex gap-2 overflow-x-auto">
        {["ทั้งหมด", "วันนี้", "เมื่อวาน", "สัปดาห์นี้"].map((item, index) => <Button key={item} variant={index === 0 ? "default" : "secondary"}>{item}</Button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <UpdateList items={getUpdates()} />
        <aside className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Filter Genre</h2>
          <div className="flex flex-wrap gap-2">
            {getGenres().slice(0, 8).map((genre) => <Button key={genre.slug} variant="ghost" size="sm">{genre.name}</Button>)}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
