import type { Metadata } from "next";

import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { listUserLibrary } from "@/services/user-service";

export const metadata: Metadata = { title: "อ่านจบแล้ว", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CompletedPage() {
  const user = await requireActiveUser("/library/completed");
  const items = await listUserLibrary(user.id, "COMPLETED");
  return <PageShell><LibraryView mode="completed" items={items} /></PageShell>;
}
