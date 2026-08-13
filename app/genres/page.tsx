import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { getGenres } from "@/services/novel-service";

export const metadata: Metadata = { title: "หมวดหมู่" };

export default function GenresPage() {
  return (
    <PageShell>
      <SectionHeader title="หมวดหมู่ทั้งหมด" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {getGenres().map((genre) => (
          <Link key={genre.slug} href={`/genre/${genre.slug}`}>
            <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand-light)]">
              <BookOpen className="mb-4 h-6 w-6 text-[var(--brand-accent)]" />
              <h2 className="font-semibold">{genre.name}</h2>
              <p className="text-sm text-muted-foreground">{genre.count.toLocaleString()} เรื่อง</p>
              <p className="mt-3 text-sm text-muted-foreground">{genre.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
