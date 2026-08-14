import type { Metadata } from "next";

import { ProfilePanel } from "@/components/interactive/account-panels";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { getProfileSummary } from "@/services/user-service";

export const metadata: Metadata = { title: "โปรไฟล์", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireActiveUser("/profile");
  const summary = await getProfileSummary(user.id);
  return (
    <PageShell className="space-y-5">
      <SectionHeader title="โปรไฟล์" />
      <ProfilePanel user={user} summary={summary} />
    </PageShell>
  );
}
