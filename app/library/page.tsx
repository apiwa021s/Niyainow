import Link from "next/link";
import type { Metadata } from "next";
import { LibraryView } from "@/components/interactive/library-view";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "คลังของฉัน" };

export default function LibraryPage() {
  return (
    <PageShell className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Link href="/library/reading"><Button>กำลังอ่าน</Button></Link>
        <Link href="/library/bookmarks"><Button variant="secondary">บุ๊กมาร์ก</Button></Link>
        <Link href="/library/completed"><Button variant="secondary">อ่านจบแล้ว</Button></Link>
      </div>
      <LibraryView mode="reading" />
    </PageShell>
  );
}
