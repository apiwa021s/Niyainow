import type { Metadata } from "next";
import Link from "next/link";

import { LibraryView } from "@/components/interactive/library-view";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { listUserLibrary } from "@/services/user-service";

export const metadata: Metadata = { title: "คลังของฉัน", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireActiveUser("/library");
  const items = await listUserLibrary(user.id, "READING");
  return (
    <PageShell className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Link href="/library/reading"><Button>กำลังอ่าน</Button></Link>
        <Link href="/library/bookmarks"><Button variant="secondary">รายการไว้อ่าน</Button></Link>
        <Link href="/library/completed"><Button variant="secondary">อ่านจบแล้ว</Button></Link>
      </div>
      <LibraryView mode="reading" items={items} />
    </PageShell>
  );
}
