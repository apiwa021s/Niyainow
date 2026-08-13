import type { Metadata } from "next";
import { SearchResults } from "@/components/interactive/search-results";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "ค้นหา" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return <PageShell><SearchResults initialQ={q} /></PageShell>;
}
