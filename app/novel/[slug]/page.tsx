import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, Eye, Star } from "lucide-react";
import { BookmarkButton, CompleteButton, FollowButton } from "@/components/interactive/novel-actions";
import { NovelCardHorizontal } from "@/components/novels/novel-card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { formatNumber } from "@/lib/utils";
import { getChapters, getNovelBySlug, getRecommendedNovels } from "@/services/novel-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const novel = getNovelBySlug(slug);
  return { title: novel?.thaiTitle ?? "ไม่พบนิยาย", description: novel?.synopsis };
}

export default async function NovelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const novel = getNovelBySlug(slug);
  if (!novel) notFound();
  const chapters = getChapters(slug);
  return (
    <PageShell className="space-y-8">
      <section className="relative overflow-hidden rounded-lg border border-border bg-card">
        <Image src={novel.backdrop} alt={novel.thaiTitle} fill sizes="100vw" className="object-cover opacity-25" />
        <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[220px_1fr]">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
            <Image src={novel.cover} alt={novel.thaiTitle} fill sizes="220px" className="object-cover" />
          </div>
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {novel.genres.map((genre) => <Link key={genre} href={`/genre/${genre}`}><Badge>{genre}</Badge></Link>)}
            </div>
            <div>
              <h1 className="text-3xl font-semibold sm:text-5xl">{novel.thaiTitle}</h1>
              <p className="mt-2 text-muted-foreground">{novel.title} · {novel.author}</p>
            </div>
            <p className="max-w-3xl leading-7 text-muted-foreground">{novel.synopsis}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 text-[var(--brand-accent)]" />{novel.rating}</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{formatNumber(novel.views)}</span>
              <span>{novel.chapters} ตอน</span>
              <span>{novel.status === "completed" ? "จบแล้ว" : novel.status === "hiatus" ? "พัก" : "กำลังแปล"}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/novel/${novel.slug}/chapter/1`} size="lg"><BookOpen className="h-5 w-5" />เริ่มอ่าน</ButtonLink>
              <ButtonLink href={`/novel/${novel.slug}/chapters`} variant="secondary">สารบัญ</ButtonLink>
              <FollowButton slug={novel.slug} />
              <BookmarkButton slug={novel.slug} />
              <CompleteButton slug={novel.slug} />
            </div>
          </div>
        </div>
      </section>
      <section>
        <SectionHeader title="ตอนล่าสุด" href={`/novel/${slug}/chapters`} action="ดูสารบัญ" />
        <div className="grid gap-2">
          {chapters.slice(0, 5).map((chapter) => (
            <Link key={chapter.number} href={`/novel/${slug}/chapter/${chapter.number}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-white/5">
              <span>ตอนที่ {chapter.number}: {chapter.title}</span>
              <span className="text-sm text-muted-foreground">{chapter.updatedAt}</span>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <SectionHeader title="น่าจะชอบต่อ" />
        <div className="grid gap-3 md:grid-cols-2">
          {getRecommendedNovels().filter((item) => item.slug !== novel.slug).slice(0, 4).map((item) => <NovelCardHorizontal key={item.slug} novel={item} />)}
        </div>
      </section>
    </PageShell>
  );
}
