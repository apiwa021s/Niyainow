import type { Metadata } from "next";

import { ProfilePanel } from "@/components/interactive/account-panels";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { getProfileSummary } from "@/services/user-service";

export const metadata: Metadata = { title: "โปรไฟล์", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireActiveUser("/profile");
  const summary = await getProfileSummary(user.id);
  return <PageShell className="space-y-6"><header className="py-2 sm:py-3"><p className="editorial-kicker">บัญชีและการอ่าน</p><h1 className="mt-1 text-h1 font-semibold sm:text-display">โปรไฟล์</h1></header><ProfilePanel user={user} summary={summary} /></PageShell>;
}
