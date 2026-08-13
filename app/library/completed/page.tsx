import type { Metadata } from "next";
import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "อ่านจบแล้ว" };

export default function CompletedPage() {
  return <PageShell><LibraryView mode="completed" /></PageShell>;
}
