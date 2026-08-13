import Image from "next/image";
import Link from "next/link";
import { BookOpen, Eye, Flame, Star } from "lucide-react";
import { BrandGlyph, BrandMark } from "@/components/brand/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { Novel } from "@/types/novel";

const statusLabel = {
  ongoing: "กำลังแปล",
  completed: "จบแล้ว",
  hiatus: "พัก"
};

export function NovelCard({ novel, progress }: { novel: Novel; progress?: number }) {
  return (
    <Link href={`/novel/${novel.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_22px_60px_rgba(0,0,0,0.36)]">
        <div className="relative aspect-[2/3] overflow-hidden">
          <Image src={novel.cover} alt={novel.thaiTitle} fill sizes="(max-width: 768px) 50vw, 180px" className="object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/8 to-transparent opacity-95" />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="border-white/15 bg-black/45 text-white">{novel.genres[0]}</Badge>
            {novel.featured ? <Badge className="gap-1 border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/18 text-[var(--brand-gold)]"><BrandGlyph type="fast" className="h-4 w-4 rounded-[4px] border-0 bg-transparent" iconClassName="h-3 w-3" />HOT</Badge> : null}
          </div>
          <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md bg-[#130537]/82 opacity-0 ring-1 ring-white/15 backdrop-blur transition group-hover:opacity-100">
            <BrandMark className="h-6 w-6" />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="line-clamp-2 text-sm font-bold leading-5 text-white">{novel.thaiTitle}</p>
            <p className="mt-1 truncate text-xs text-white/68">{novel.title}</p>
          </div>
        </div>
        <div className="space-y-2 p-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[var(--brand-accent)] text-[var(--brand-accent)]" />{novel.rating}</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{formatNumber(novel.views)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{novel.chapters} ตอน</span>
            <span>{statusLabel[novel.status]}</span>
          </div>
          {typeof progress === "number" ? (
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>อ่านแล้ว</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}

export function NovelCardHorizontal({ novel, href }: { novel: Novel; href?: string }) {
  return (
    <Link href={href ?? `/novel/${novel.slug}`} className="group grid grid-cols-[64px_1fr] gap-3 rounded-lg border border-border bg-card/88 p-2 transition hover:border-white/20 hover:bg-white/5">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md">
        <Image src={novel.cover} alt={novel.thaiTitle} fill sizes="80px" className="object-cover transition duration-300 group-hover:scale-105" />
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <Badge className="px-1.5 py-0.5">{novel.genres[0]}</Badge>
          <span className="text-[11px] text-muted-foreground">{statusLabel[novel.status]}</span>
        </div>
        <h3 className="truncate text-sm font-bold">{novel.thaiTitle}</h3>
        <p className="truncate text-xs text-muted-foreground">{novel.title}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-[var(--brand-accent)]" />{novel.rating}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatNumber(novel.views)}</span>
          <span>{novel.chapters} ตอน</span>
        </div>
      </div>
    </Link>
  );
}

export function NovelMiniCard({ novel }: { novel: Novel }) {
  return (
    <Link href={`/novel/${novel.slug}`} className="flex min-w-0 items-center gap-3 rounded-md p-2 transition hover:bg-white/10">
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded">
        <Image src={novel.cover} alt={novel.thaiTitle} fill sizes="40px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{novel.thaiTitle}</p>
        <p className="text-xs text-muted-foreground">{novel.genres[0]} · {formatNumber(novel.views)}</p>
      </div>
    </Link>
  );
}

export function NovelRankingItem({ novel, rank }: { novel: Novel; rank: number }) {
  const trend = rank % 3 === 0 ? "–" : rank % 2 === 0 ? "↓ 1" : "↑ 2";
  const topRank = rank <= 3;

  return (
    <Link href={`/novel/${novel.slug}`} className="group grid grid-cols-[42px_52px_1fr_auto] items-center gap-2.5 rounded-lg border border-border bg-card/88 p-2 transition hover:border-white/20 hover:bg-white/5">
      <span className={topRank ? "grid h-9 w-9 place-items-center rounded-md bg-primary font-mono text-sm font-bold text-white" : "font-mono text-sm font-bold text-[var(--brand-accent)]"}>#{rank}</span>
      <div className="relative h-14 overflow-hidden rounded-md">
        <Image src={novel.cover} alt={novel.thaiTitle} fill sizes="56px" className="object-cover transition duration-300 group-hover:scale-105" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{novel.thaiTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{novel.genres[0]} · {novel.chapters} ตอน</p>
      </div>
      <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
        {topRank ? <Flame className="h-3 w-3 text-[var(--brand-accent)]" /> : null}
        {trend}
      </span>
    </Link>
  );
}
