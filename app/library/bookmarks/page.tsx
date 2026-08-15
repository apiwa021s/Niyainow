import type { Metadata } from "next";

import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { listUserLibrary } from "@/services/user-service";

export const metadata: Metadata = { title: "รายการไว้อ่าน", robots: { index: false, follow: false } };

export default async function BookmarksPage() {
  const user = await requireActiveUser("/library/bookmarks");
  const items = await listUserLibrary(user.id, "PLAN_TO_READ");
  return <PageShell><LibraryView mode="bookmarks" items={items} /></PageShell>;
}
