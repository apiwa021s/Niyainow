import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form-controls";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { getTags } from "@/services/novel-service";

export const metadata: Metadata = { title: "แท็กยอดนิยม" };

export default function TagsPage() {
  return (
    <PageShell className="space-y-5">
      <SectionHeader title="แท็กยอดนิยม" />
      <Input placeholder="ค้นหาแท็ก..." />
      <div className="flex flex-wrap gap-2">
        {getTags().map((tag) => <Link key={tag} href={`/tag/${encodeURIComponent(tag.toLowerCase())}`}><Badge className="px-3 py-2">#{tag}</Badge></Link>)}
      </div>
    </PageShell>
  );
}
