import Link from "next/link";
import { BookOpen, Flame, Sparkles, Timer } from "lucide-react";
import { ContinueReading } from "@/components/home/continue-reading";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { NovelCard, NovelRankingItem } from "@/components/novels/novel-card";
import { UpdateList } from "@/components/novels/update-list";
import { Badge } from "@/components/ui/badge";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { getFeaturedNovels, getGenres, getRankings, getRecommendedNovels, getUpdates } from "@/services/novel-service";

export default function HomePage() {
  const rankings = getRankings();

  return (
    <PageShell className="space-y-6">
      <HeroCarousel novels={getFeaturedNovels()} />
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: BookOpen, label: "นิยายพร้อมอ่าน", value: "1,200+" },
          { icon: Timer, label: "อัปเดตวันนี้", value: "86 ตอน" },
          { icon: Sparkles, label: "อ่านต่อในคลัง", value: "บันทึกอัตโนมัติ" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="premium-panel rounded-lg border border-border p-3">
              <span className="mb-2 grid h-8 w-8 place-items-center rounded-md bg-primary/12 text-[var(--brand-accent)] ring-1 ring-border">
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold">{item.value}</p>
            </div>
          );
        })}
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <ContinueReading />
          <section>
            <SectionHeader title="อัปเดตล่าสุด" href="/updates" action="ดูทั้งหมด" />
            <UpdateList items={getUpdates()} limit={8} />
          </section>
          <section>
            <SectionHeader title="แนะนำสำหรับคุณ" href="/novels?sort=rating" action="ดูเพิ่ม" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {getRecommendedNovels().map((novel) => <NovelCard key={novel.slug} novel={novel} />)}
            </div>
          </section>
          <section>
            <SectionHeader title="หมวดหมู่ยอดนิยม" href="/genres" action="ทั้งหมด" />
            <div className="flex flex-wrap gap-2">
              {getGenres().slice(0, 14).map((genre) => (
                <Link key={genre.slug} href={`/genre/${genre.slug}`}>
                  <Badge className="px-3 py-2 transition hover:border-white/20 hover:text-foreground">{genre.name}</Badge>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <SectionHeader title="กำลังมาแรง" />
          <div className="grid gap-2">
            {rankings.slice(0, 8).map((novel, index) => <NovelRankingItem key={novel.slug} novel={novel} rank={index + 1} />)}
          </div>
          <div className="premium-panel rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2 font-bold"><Flame className="h-4 w-4 text-[var(--brand-accent)]" />นิยมสัปดาห์นี้</div>
            <p className="text-sm leading-6 text-muted-foreground">นิยายระบบและแฟนตาซีกำลังถูกเปิดอ่านมากที่สุด เหมาะสำหรับเริ่มอ่านแบบไม่ต้องเลือกนาน</p>
          </div>
          <div className="premium-panel rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-[var(--brand-fresh)]" />นิยายใหม่</div>
            <p className="text-sm leading-6 text-muted-foreground">เพิ่มเรื่องใหม่ทุกวัน พร้อมติดตามตอนล่าสุดผ่านหน้าแจ้งเตือนและคลังส่วนตัว</p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
