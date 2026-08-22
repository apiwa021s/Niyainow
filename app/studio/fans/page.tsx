import type { Metadata } from "next";
import { BookOpenCheck, Crown, Repeat2, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { StatTile, StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { getStudioFanGrowth, getStudioFanPreferences, getStudioFanSources, getStudioFanSummary } from "@/services/studio-analytics-service";
import { getWriterProfileForUser } from "@/services/studio-service";

export const metadata: Metadata = { title: "แฟนของฉัน" };

export default async function StudioFansPage() {
  const user = await requireActiveUser("/studio/fans");
  if (!(await getWriterProfileForUser(user.id))) redirect("/studio/profile");
  const [summary, growth, preferences, sources] = await Promise.all([getStudioFanSummary(user.id), getStudioFanGrowth(user.id), getStudioFanPreferences(user.id), getStudioFanSources(user.id)]);
  return <div><StudioPageHeader eyebrow="Studio / แฟนของฉัน" title="แฟนของฉัน" description="ข้อมูลรวมเพื่อเข้าใจผู้ชม โดยไม่เปิดเผยตัวตน ประวัติอ่าน หรือยอดใช้จ่ายของ Reader รายบุคคล" /><div className="grid gap-3 sm:grid-cols-3"><StatTile icon={Users} label="ผู้ติดตาม" value={summary.followerCount.toLocaleString("th-TH")} /><StatTile icon={Crown} label="สมาชิก" value={summary.memberCount.toLocaleString("th-TH")} /><StatTile icon={Repeat2} label="ผู้อ่านที่กลับมา" value={summary.returningReaders.toLocaleString("th-TH")} /></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><section className="rounded-[8px] border border-border bg-card p-5"><h2 className="font-semibold">ผู้ติดตามใหม่ · 30 วัน</h2>{growth.points.length ? <div className="mt-4 grid gap-2">{growth.points.map((point) => <div key={point.date} className="flex items-center justify-between text-sm"><span className="text-(--text-secondary)">{point.date}</span><strong className="tabular-nums">+{point.newFollowers}</strong></div>)}</div> : <p className="mt-4 text-sm text-(--text-secondary)">ยังไม่มีผู้ติดตามใหม่ในช่วงนี้</p>}</section><section className="rounded-[8px] border border-border bg-card p-5"><h2 className="font-semibold">เรื่องที่พาคนอ่านมา</h2>{sources.sources.length ? <div className="mt-4 grid gap-2">{sources.sources.map((source) => <div key={source.storyId} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-(--text-secondary)">{source.storyTitle}</span><strong className="tabular-nums">{source.readers.toLocaleString("th-TH")}</strong></div>)}</div> : <p className="mt-4 text-sm text-(--text-secondary)">ยังไม่มีข้อมูลการอ่าน</p>}</section></div><section className="mt-4 rounded-[8px] border border-border bg-card p-5"><div className="flex items-start gap-3"><BookOpenCheck className="h-5 w-5 shrink-0 text-brand-primary" aria-hidden /><div><h2 className="font-semibold">ความสนใจของผู้ชม</h2><p className="mt-1 text-xs leading-5 text-(--text-tertiary)">แสดงเมื่อมีผู้อ่านอย่างน้อย {preferences.minimumSampleThreshold} คน เพื่อป้องกันการอนุมานข้อมูลรายบุคคล</p></div></div>{preferences.visible ? <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><Preference title="แนว" rows={preferences.genres ?? []} /><Preference title="ความสัมพันธ์" rows={preferences.relationships ?? []} /><Preference title="โลกของเรื่อง" rows={preferences.settings ?? []} /><Preference title="พล็อต" rows={preferences.tropes ?? []} /></div> : <p className="mt-5 rounded-[6px] bg-muted p-4 text-sm text-(--text-secondary)">ข้อมูลยังไม่ถึงเกณฑ์สำหรับแสดง Insight ({preferences.sampleSize}/{preferences.minimumSampleThreshold} คน)</p>}</section></div>;
}

function Preference({ title, rows }: { title: string; rows: { id: string; nameTh: string | null; readers: number }[] }) {
  return <div><h3 className="text-sm font-semibold">{title}</h3><div className="mt-2 grid gap-1.5">{rows.slice(0, 5).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-(--text-secondary)">{row.nameTh || "ไม่ระบุ"}</span><span className="tabular-nums">{row.readers}</span></div>)}</div></div>;
}
