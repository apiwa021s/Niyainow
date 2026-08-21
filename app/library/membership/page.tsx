import type { Metadata } from "next";

import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Membership ของฉัน", robots: { index: false, follow: false } };

/** Membership records are a local-only mock (see lib/domain/reader-membership.ts) — no server query needed here. */
export default async function LibraryMembershipPage() {
  await requireActiveUser("/library/membership");

  return (
    <PageShell>
      <LibraryView mode="membership" items={[]} pagination={{ page: 1, pageSize: 0, total: 0, totalPages: 1 }} />
    </PageShell>
  );
}
