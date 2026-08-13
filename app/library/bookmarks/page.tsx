import type { Metadata } from "next";
import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "บุ๊กมาร์ก" };

export default function BookmarksPage() {
  return <PageShell><LibraryView mode="bookmarks" /></PageShell>;
}
