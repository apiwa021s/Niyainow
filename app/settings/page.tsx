import type { Metadata } from "next";

import { SettingsPanel } from "@/components/interactive/account-panels";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "ตั้งค่า", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireActiveUser("/settings");
  return (
    <PageShell className="space-y-5">
      <SectionHeader title="ตั้งค่า" />
      <SettingsPanel user={user} />
    </PageShell>
  );
}
