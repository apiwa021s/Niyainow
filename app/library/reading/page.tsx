import type { Metadata } from "next";

import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { listUserLibrary } from "@/services/user-service";

export const metadata: Metadata = { title: "กำลังอ่าน", robots: { index: false, follow: false } };

export default async function ReadingPage() {
  const user = await requireActiveUser("/library/reading");
  const items = await listUserLibrary(user.id, "READING");
  return <PageShell><LibraryView mode="reading" items={items} /></PageShell>;
}
