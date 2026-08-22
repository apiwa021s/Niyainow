import type { Metadata } from "next";
import { Bell, ExternalLink, ShieldCheck, UserRoundPen } from "lucide-react";
import Link from "next/link";

import { StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterProfileForUser } from "@/services/studio-service";

export const metadata: Metadata = { title: "ตั้งค่านักเขียน" };

export default async function StudioSettingsPage() {
  const user = await requireActiveUser("/studio/settings");
  const profile = await getWriterProfileForUser(user.id);
  return <><StudioPageHeader eyebrow="Studio / การตั้งค่า" title="การตั้งค่า" description="จัดการตัวตนนักเขียน การแจ้งเตือน และความเป็นส่วนตัวจากแหล่งข้อมูลจริง" /><div className="grid gap-4 lg:grid-cols-2"><SettingsLink href="/studio/profile" icon={UserRoundPen} title="โปรไฟล์นักเขียน" description={profile ? `${profile.displayName} · @${profile.username}` : "สร้างนามปากกาและ Username"} /><SettingsLink href="/settings" icon={Bell} title="การแจ้งเตือนและความเป็นส่วนตัว" description="ตั้งค่าประวัติการอ่าน Library และชื่อเรื่องในการแจ้งเตือน" external /><section className="rounded-[8px] border border-border bg-card p-5 lg:col-span-2"><div className="flex items-start gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[var(--success)]" aria-hidden /><div><h2 className="font-semibold">บัญชีและความปลอดภัย</h2><p className="mt-1 text-sm leading-6 text-(--text-secondary)">เข้าสู่ระบบด้วย Google · {user.email ?? "ไม่พบอีเมล"} · จำกัด session พร้อมกันสูงสุด 2 อุปกรณ์</p><p className="mt-2 text-xs text-(--text-tertiary)">การเปลี่ยนอีเมลหรือสิทธิ์บัญชีต้องดำเนินการผ่าน Google และทีม NovelNow เพื่อป้องกันการยึดบัญชี</p></div></div></section></div></>;
}

function SettingsLink({ href, icon: Icon, title, description, external = false }: { href: string; icon: typeof Bell; title: string; description: string; external?: boolean }) {
  return <Link href={href} className="flex min-h-28 items-start gap-3 rounded-[8px] border border-border bg-card p-5 transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-muted/40"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[6px] bg-accent-subtle text-brand-primary"><Icon className="h-5 w-5" aria-hidden /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-(--text-secondary)">{description}</p></div>{external ? <ExternalLink className="h-4 w-4 shrink-0 text-(--text-tertiary)" aria-hidden /> : null}</Link>;
}
