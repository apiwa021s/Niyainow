import type { Metadata } from "next";

import { SettingsPanel } from "@/components/interactive/account-panels";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "ตั้งค่า", robots: { index: false, follow: false } };

export default async function SettingsPage() {
  const user = await requireActiveUser("/settings");
  return <PageShell className="space-y-6"><header><p className="editorial-kicker">ปรับให้เหมาะกับคุณ</p><h1 className="mt-1 font-serif text-3xl font-semibold">ตั้งค่า</h1><p className="mt-2 text-sm text-muted-foreground">บัญชี รูปลักษณ์เว็บไซต์ และค่าการอ่านบนอุปกรณ์นี้</p></header><SettingsPanel user={user} /></PageShell>;
}
