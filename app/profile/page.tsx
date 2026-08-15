import type { Metadata } from "next";

import { ProfilePanel } from "@/components/interactive/account-panels";
import { PageHeader, PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { getProfileSummary } from "@/services/user-service";

export const metadata: Metadata = { title: "โปรไฟล์", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireActiveUser("/profile");
  const summary = await getProfileSummary(user.id);
  return (
    <PageShell className="space-y-5">
      <PageHeader title="โปรไฟล์" description="บัญชี การอ่าน และชั้นหนังสือของคุณ" />
      <ProfilePanel user={user} summary={summary} />
    </PageShell>
  );
}
