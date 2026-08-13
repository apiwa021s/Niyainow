import type { Metadata } from "next";
import { NovelBrowser } from "@/components/interactive/novel-browser";
import { PageShell } from "@/components/ui/section";
import type { NovelQuery } from "@/services/novel-service";

export const metadata: Metadata = { title: "นิยายทั้งหมด" };

export default async function NovelsPage({ searchParams }: { searchParams: Promise<NovelQuery> }) {
  const query = await searchParams;
  return <PageShell><NovelBrowser initialQuery={query} /></PageShell>;
}
