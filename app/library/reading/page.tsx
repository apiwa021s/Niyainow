import type { Metadata } from "next";
import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "กำลังอ่าน" };

export default function ReadingPage() {
  return <PageShell><LibraryView mode="reading" /></PageShell>;
}
