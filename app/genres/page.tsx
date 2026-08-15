import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import { JsonLd } from "@/components/seo/json-ld";
import { Card } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getGenres } from "@/services/novel-service";

export const metadata: Metadata = pageMetadata({
  title: "หมวดหมู่นิยาย",
  description: "เลือกอ่านนิยายตามหมวดหมู่และแนวที่คุณชอบบน NiyaiThai",
  path: "/genres",
});

export default async function GenresPage() {
  const genres = await getGenres();
  return (
    <PageShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "หมวดหมู่นิยาย",
          itemListElement: genres.map((genre, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: genre.thaiName,
            url: absoluteUrl(`/genre/${genre.slug}`),
          })),
        }}
      />
      <PageHeader title="หมวดหมู่ทั้งหมด" description="แนวนิยายในแบบบรรณาธิการ—เลือกจากอารมณ์และโลกที่อยากเข้าไปอ่าน" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {genres.map((genre) => (
          <Link key={genre.slug} href={`/genre/${genre.slug}`}>
            <Card className="h-full p-5 transition-colors hover:border-[var(--brand-primary)]">
              <BookOpen className="mb-4 h-6 w-6 text-[var(--brand-primary)]" />
              <h2 className="font-serif text-lg font-semibold">{genre.thaiName}</h2>
              {genre.name !== genre.thaiName ? <p className="text-xs text-muted-foreground">{genre.name}</p> : null}
              <p className="text-sm text-muted-foreground">{genre.count.toLocaleString("th-TH")} เรื่อง</p>
              {genre.description ? <p className="mt-3 text-sm text-muted-foreground">{genre.description}</p> : null}
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
