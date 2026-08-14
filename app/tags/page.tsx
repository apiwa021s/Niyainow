import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form-controls";
import { EmptyState, PageShell, SectionHeader } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { getTags } from "@/services/novel-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  return pageMetadata({
    title: query ? `ค้นหาแท็ก “${query}”` : "แท็กยอดนิยม",
    description: "สำรวจแท็กนิยายยอดนิยมและค้นหาเรื่องที่ตรงกับความสนใจ",
    path: query ? `/tags?q=${encodeURIComponent(query)}` : "/tags",
    noIndex: Boolean(query),
  });
}

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const tags = await getTags(query || undefined, 100);
  return (
    <PageShell className="space-y-5">
      <SectionHeader title="แท็กยอดนิยม" />
      <form action="/tags">
        <Input name="q" defaultValue={query} placeholder="ค้นหาแท็ก..." maxLength={100} />
      </form>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link key={tag.slug} href={`/tag/${tag.slug}`}>
              <Badge className="px-3 py-2">#{tag.name}{tag.count > 0 ? ` · ${tag.count.toLocaleString("th-TH")}` : ""}</Badge>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="ไม่พบแท็ก" description="ลองใช้คำค้นที่สั้นลงหรือสะกดใหม่" />
      )}
    </PageShell>
  );
}
