import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, ClipboardCheck, Coins, Eye, FileStack, Flag, MessageSquare, Users, Wallet } from "lucide-react";
import { AreaTrend, ColumnChart, Sparkline } from "@/components/admin/charts";
import { AdminPageHeader, Panel, StatCard, TaskLink } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { PUBLISH_STATUS } from "@/lib/admin-labels";
import { formatNumber } from "@/lib/utils";
import { dailyReaders, monthlyRevenue } from "@/data/admin-data";
import {
  getActivities,
  getDashboardStats,
  getNovelStatusCounts,
  getPendingWork,
  getScheduledChapters,
  getTopNovels
} from "@/services/admin-service";

export const metadata: Metadata = {
  title: "แดชบอร์ด",
  description: "ภาพรวมยอดอ่าน รายได้ และงานที่รอดำเนินการของ NiyaiNow"
};

const STAT_ICONS: Record<string, React.ReactNode> = {
  readers: <Eye className="h-5 w-5" />,
  revenue: <Wallet className="h-5 w-5" />,
  members: <Users className="h-5 w-5" />,
  coins: <Coins className="h-5 w-5" />
};

export default function AdminDashboardPage() {
  const stats = getDashboardStats();
  const pending = getPendingWork();
  const topNovels = getTopNovels(5);
  const scheduled = getScheduledChapters(5);
  const activities = getActivities(6);
  const statusCounts = getNovelStatusCounts();

  return (
    <>
      <AdminPageHeader
        title="แดชบอร์ด"
        description="สรุปภาพรวมของวันนี้ และงานที่ทีมต้องเคลียร์ก่อนสิ้นวัน"
        actions={
          <>
            <ButtonLink href="/admin/novels/new" size="md">
              <BookOpen className="h-4 w-4" />
              เพิ่มนิยาย
            </ButtonLink>
            <ButtonLink href="/admin/analytics" variant="outline" size="md">
              ดูสถิติเชิงลึก
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            unit={stat.unit}
            delta={stat.delta}
            hint={stat.hint}
            icon={STAT_ICONS[stat.id]}
            chart={
              stat.id === "readers" ? (
                <Sparkline data={dailyReaders.slice(-12)} />
              ) : stat.id === "revenue" ? (
                <Sparkline data={monthlyRevenue.slice(-12)} />
              ) : undefined
            }
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <Panel title="ผู้อ่านรายวัน" description="จำนวนผู้อ่านไม่ซ้ำ 14 วันล่าสุด">
            <AreaTrend data={dailyReaders} unit="คน" numberFormat="compact" label="กราฟผู้อ่านรายวัน 14 วันล่าสุด" />
          </Panel>

          <Panel title="รายได้รายเดือน" description="ยอดเติมเหรียญที่ชำระสำเร็จ 12 เดือนล่าสุด (บาท)">
            <ColumnChart data={monthlyRevenue} unit="บาท" numberFormat="compact" label="กราฟรายได้รายเดือน 12 เดือนล่าสุด" />
          </Panel>
        </div>

        <div className="grid content-start gap-4">
          <Panel title="รอคุณดำเนินการ" description="กดเพื่อไปยังคิวงานนั้นได้ทันที" bodyClassName="grid gap-2 p-3">
            <TaskLink
              href="/admin/submissions"
              label="เรื่องรออนุมัติ"
              count={pending.submissions}
              tone="warning"
              icon={<ClipboardCheck className="h-4 w-4" />}
            />
            <TaskLink
              href="/admin/reports"
              label="รายงานที่ยังไม่ปิด"
              count={pending.reports}
              tone="danger"
              icon={<Flag className="h-4 w-4" />}
            />
            <TaskLink
              href="/admin/comments?status=pending"
              label="คอมเมนต์รอตรวจ"
              count={pending.comments}
              tone="warning"
              icon={<MessageSquare className="h-4 w-4" />}
            />
            <TaskLink
              href="/admin/payouts"
              label="คำขอถอนรายได้"
              count={pending.payouts}
              tone="warning"
              icon={<Wallet className="h-4 w-4" />}
            />
            <TaskLink
              href="/admin/chapters?status=draft"
              label="ตอนที่ยังเป็นฉบับร่าง"
              count={pending.drafts}
              icon={<FileStack className="h-4 w-4" />}
            />
          </Panel>

          <Panel
            title="ตอนที่ตั้งเวลาไว้"
            description="คิวเผยแพร่อัตโนมัติ"
            action={
              <Link href="/admin/chapters?status=scheduled" prefetch className="text-sm font-semibold text-[var(--brand-light-on-light)] hover:underline">
                ดูทั้งหมด
              </Link>
            }
            bodyClassName="p-3"
          >
            {scheduled.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">ยังไม่มีตอนที่ตั้งเวลาไว้</p>
            ) : (
              <ul className="grid gap-1">
                {scheduled.map((chapter) => (
                  <li key={chapter.id}>
                    <Link
                      href={`/admin/novels/${chapter.novelSlug}/chapters/${chapter.number}`}
                      prefetch
                      className="grid gap-0.5 rounded-[10px] px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <span className="truncate text-sm font-medium">{chapter.novelTitle}</span>
                      <span className="text-xs text-muted-foreground">
                        ตอนที่ {chapter.number} · {chapter.scheduledFor}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="เรื่องที่ทำรายได้สูงสุด"
          description="นับจากยอดเหรียญที่ใช้ปลดล็อกตอนในเดือนนี้"
          action={
            <Link href="/admin/novels?sort=revenue" prefetch className="text-sm font-semibold text-[var(--brand-light-on-light)] hover:underline">
              ดูทั้งหมด
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {topNovels.map((novel, index) => (
              <li key={novel.slug}>
                <Link href={`/admin/novels/${novel.slug}`} prefetch className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted">
                  <span className="tabular w-5 shrink-0 text-sm font-bold text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{novel.thaiTitle}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {novel.owner} · {formatNumber(novel.viewsThisWeek)} วิวสัปดาห์นี้
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-semibold">{novel.revenueTHB.toLocaleString("th-TH")} ฿</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="กิจกรรมล่าสุดของทีม"
          description="ทุกการเปลี่ยนแปลงถูกบันทึกไว้ตรวจสอบย้อนหลังได้"
          action={
            <Link href="/admin/activity" prefetch className="text-sm font-semibold text-[var(--brand-light-on-light)] hover:underline">
              ดูบันทึกทั้งหมด
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {activities.map((activity) => (
              <li key={activity.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{activity.actor}</span>
                  <StatusPill label={activity.target} tone="neutral" />
                  <span className="ml-auto text-xs text-muted-foreground">{activity.at}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{activity.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="สถานะการเผยแพร่ของนิยายทั้งหมด" description="กดที่สถานะเพื่อเปิดหน้าจัดการนิยายพร้อมตัวกรองนั้น" className="mt-6">
        <ul className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {(Object.keys(PUBLISH_STATUS) as (keyof typeof PUBLISH_STATUS)[]).map((status) => (
            <li key={status}>
              <Link
                href={`/admin/novels?status=${status}`}
                prefetch
                className="flex flex-col gap-2 rounded-[12px] border border-border px-3 py-3 transition-colors hover:bg-muted"
              >
                <StatusPill label={PUBLISH_STATUS[status].label} tone={PUBLISH_STATUS[status].tone} />
                <span className="tabular text-xl font-bold">{(statusCounts[status] ?? 0).toLocaleString("th-TH")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
