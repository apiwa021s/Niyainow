import Link from "next/link";
import type { Metadata } from "next";
import { AdminPageHeader, Panel, StatCard } from "@/components/admin/admin-ui";
import { AreaTrend, RankedBars } from "@/components/admin/charts";
import { AnalyticsTrends } from "@/components/admin/views/analytics-view";
import { formatNumber } from "@/lib/utils";
import { genreShare, hourlyTraffic, retentionCurve } from "@/data/admin-data";
import { getDashboardStats, getTopNovels } from "@/services/admin-service";

export const metadata: Metadata = {
  title: "สถิติเชิงลึก",
  description: "ผู้อ่าน รายได้ แนวยอดนิยม และอัตราคงอยู่ของผู้ใช้ใหม่"
};

export default function AdminAnalyticsPage() {
  const stats = getDashboardStats();
  const topNovels = getTopNovels(8);

  return (
    <>
      <AdminPageHeader
        title="สถิติเชิงลึก"
        description="ตัวเลขชุดเดียวกับที่ใช้ตัดสินใจเรื่องคอนเทนต์และแคมเปญ — ทุกกราฟกดดูเป็นตารางได้"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "สถิติเชิงลึก" }]}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.id} label={stat.label} value={stat.value} unit={stat.unit} delta={stat.delta} hint={stat.hint} />
        ))}
      </div>

      <AnalyticsTrends />

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="สัดส่วนการอ่านตามแนว" description="เปอร์เซ็นต์ของยอดอ่านทั้งหมดในเดือนนี้">
          <RankedBars data={genreShare} unit="%" />
        </Panel>

        <Panel title="ช่วงเวลาที่คนอ่านมากที่สุด" description="ยอดเปิดอ่านต่อช่วงเวลา (พันครั้ง) — ใช้เลือกเวลาปล่อยตอนใหม่">
          <RankedBars data={hourlyTraffic} unit="พันครั้ง" />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="อัตราคงอยู่ของผู้ใช้ใหม่" description="เปอร์เซ็นต์ที่ยังกลับมาอ่านหลังสมัคร">
          <AreaTrend data={retentionCurve} unit="%" height={220} label="กราฟอัตราคงอยู่ของผู้ใช้ใหม่ D1 ถึง D90" />
        </Panel>

        <Panel
          title="เรื่องที่ทำรายได้สูงสุด"
          description="เรียงตามรายได้สะสมในเดือนนี้"
          bodyClassName="p-0"
          action={
            <Link href="/admin/novels?sort=revenue" prefetch className="text-sm font-semibold text-[var(--brand-light-on-light)] hover:underline">
              จัดการนิยาย
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {topNovels.map((novel, index) => (
              <li key={novel.slug}>
                <Link href={`/admin/novels/${novel.slug}`} prefetch className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted">
                  <span className="tabular w-5 shrink-0 text-sm font-bold text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{novel.thaiTitle}</span>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{formatNumber(novel.views)} วิว</span>
                  <span className="tabular shrink-0 text-sm font-semibold">{novel.revenueTHB.toLocaleString("th-TH")} ฿</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
