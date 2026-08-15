import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { EmptyState, PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getGenres } from "@/services/novel-service";

export const metadata: Metadata = pageMetadata({ title: "หมวดหมู่นิยาย", description: "เลือกอ่านนิยายตามโลก อารมณ์ และแนวเรื่องบน NiyaiThai", path: "/genres" });

export default async function GenresPage() {
  const genres = await getGenres();
  return (
    <PageShell className="space-y-7">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: "หมวดหมู่นิยาย", itemListElement: genres.map((genre, index) => ({ "@type": "ListItem", position: index + 1, name: genre.thaiName, url: absoluteUrl(`/genre/${genre.slug}`) })) }} />
      <header className="border-b border-border pb-5"><p className="editorial-kicker">เลือกโลกที่อยากเข้าไปอ่าน</p><h1 className="mt-1 font-serif text-3xl font-semibold">หมวดหมู่ทั้งหมด</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">เริ่มจากอารมณ์และแนวเรื่อง แต่ละหมวดมีชั้นเรื่องเด่น อัปเดตล่าสุด และเรื่องจบแล้ว</p></header>
      {genres.length ? (
        <ul className="grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3">
          {genres.map((genre) => (
            <li key={genre.slug} className="border-b border-r border-border">
              <Link href={`/genre/${genre.slug}`} className="group flex min-h-48 flex-col p-5 transition-colors hover:bg-muted/45">
                <BookOpen className="h-5 w-5 text-[var(--brand-emphasis)]" />
                <h2 className="mt-5 font-serif text-xl font-semibold group-hover:text-[var(--brand-emphasis)]">{genre.thaiName}</h2>
                {genre.name !== genre.thaiName ? <p className="mt-0.5 text-xs text-muted-foreground">{genre.name}</p> : null}
                {genre.description ? <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{genre.description}</p> : null}
                <span className="tabular mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">{genre.count.toLocaleString("th-TH")} เรื่อง<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="ยังไม่มีหมวดหมู่" description="หมวดหมู่จะปรากฏเมื่อมีนิยายที่เผยแพร่ในคลัง" />}
    </PageShell>
  );
}
