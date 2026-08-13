import type { Metadata } from "next";
import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "ประวัติการอ่าน" };

export default function HistoryPage() {
  return <PageShell><LibraryView mode="history" /></PageShell>;
}
