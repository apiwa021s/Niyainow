import { BookOpen, CircleDollarSign, Crown, PenLine, Plus, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState, StatTile, StudioPageHeader, StudioRowLink } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";
import { requireActiveUser } from "@/lib/auth/dal";
import { getStudioEarnings, getStudioFanSummary } from "@/services/studio-analytics-service";
import { getWriterProfileForUser, listWriterStories } from "@/services/studio-service";

const money = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });

export default async function StudioDashboardPage() {
  const user = await requireActiveUser("/studio");
  const profile = await getWriterProfileForUser(user.id);
  if (!profile) redirect("/studio/profile");
  const [stories, earnings, fans] = await Promise.all([listWriterStories(user.id), getStudioEarnings(user.id), getStudioFanSummary(user.id)]);
  return <><StudioPageHeader eyebrow="Studio" title={`สวัสดี ${profile.displayName}`} description="ภาพรวมงานเขียน แฟน และรายได้จากข้อมูลจริงล่าสุด" action={<ButtonLink href="/studio/works/new"><Plus className="h-4 w-4" aria-hidden />สร้างเรื่องใหม่</ButtonLink>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatTile icon={BookOpen} label="ผลงาน" value={stories.length.toLocaleString("th-TH")} /><StatTile icon={Users} label="ผู้ติดตาม" value={fans.followerCount.toLocaleString("th-TH")} /><StatTile icon={Crown} label="สมาชิก" value={fans.memberCount.toLocaleString("th-TH")} /><StatTile icon={CircleDollarSign} label="รายได้สะสม" value={money.format(earnings.lifetimeEarningsMinor / 100)} tone="money" /></div><section className="mt-4 overflow-hidden rounded-[8px] border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">เขียนต่อ</h2><p className="mt-1 text-xs text-(--text-tertiary)">เรียงจากผลงานที่แก้ไขล่าสุด</p></div><ButtonLink href="/studio/works" variant="ghost">ดูทั้งหมด</ButtonLink></div>{stories.length ? <ul className="divide-y divide-border">{stories.slice(0, 5).map((story) => <li key={story.id}><StudioRowLink href={`/studio/works/${story.slug}`}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[6px] bg-accent-subtle text-brand-primary"><PenLine className="h-4 w-4" aria-hidden /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{story.title}</p><p className="mt-1 text-xs text-(--text-tertiary)">{story.publishStatus === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</p></div></div></StudioRowLink></li>)}</ul> : <EmptyState icon={PenLine} title="เริ่มเรื่องแรก" description="สร้างผลงานเป็นฉบับร่าง แล้วเริ่มเขียนตอนแรกได้ทันที" action={<ButtonLink href="/studio/works/new">สร้างเรื่องใหม่</ButtonLink>} />}</section></>;
}
