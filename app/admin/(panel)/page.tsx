import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileStack, Plus, Users } from "lucide-react";

import { AdminPageHeader, Panel, StatCard } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { getDashboard, getPendingWork } from "@/services/admin-service";

export const metadata: Metadata = { title: "แดชบอร์ด" };

export default async function AdminDashboardPage() {
  const [dashboard, pending] = await Promise.all([getDashboard(), getPendingWork()]);
  return <>
    <AdminPageHeader title="แดชบอร์ด" description="สถานะการปฏิบัติงานจริงจากฐานข้อมูล" actions={<ButtonLink href="/admin/novels/new"><Plus className="h-4 w-4" />เพิ่มนิยาย</ButtonLink>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="นิยายทั้งหมด" value={dashboard.counts.novels} hint={`${dashboard.counts.publishedNovels.toLocaleString("th-TH")} เรื่องเผยแพร่`} icon={<BookOpen className="h-5 w-5" />} />
      <StatCard label="ตอนทั้งหมด" value={dashboard.counts.chapters} hint={`${dashboard.counts.publishedChapters.toLocaleString("th-TH")} ตอนเผยแพร่`} icon={<FileStack className="h-5 w-5" />} />
      <StatCard label="ฉบับร่าง" value={pending.drafts} hint={`${pending.scheduled.toLocaleString("th-TH")} ตอนตั้งเวลา`} icon={<FileStack className="h-5 w-5" />} />
      <StatCard label="ผู้ใช้ active" value={dashboard.counts.activeUsers} hint="บัญชีสถานะ ACTIVE" icon={<Users className="h-5 w-5" />} />
    </div>
    <Panel title="กิจกรรมล่าสุด" description="บันทึกจาก admin_audit_logs" action={<Link href="/admin/activity" className="text-sm font-semibold text-[var(--brand-light-on-light)] hover:underline">ดูทั้งหมด</Link>} className="mt-4">
      <div className="grid divide-y divide-border">{dashboard.recentActivity.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm"><span className="min-w-40 font-medium">{item.actor}</span><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.action}</code><span className="min-w-0 flex-1 text-muted-foreground">{item.entityType}{item.entityId ? ` · ${item.entityId}` : ""}</span><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("th-TH")}</time></div>)}{!dashboard.recentActivity.length ? <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p> : null}</div>
    </Panel>
  </>;
}
