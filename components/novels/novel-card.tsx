import Image from "next/image";
import Link from "next/link";
import { Coins, Eye, Star } from "lucide-react";
import { BookmarkToggle } from "@/components/interactive/novel-actions";
import { cn, formatNumber } from "@/lib/utils";
import type { Novel } from "@/types/novel";

const statusLabel: Record<Novel["status"], string> = {
  ongoing: "กำลังแปล",
  completed: "จบแล้ว",
  hiatus: "พักการแปล"
};

const genreNameOf = (novel: Novel, slug: string) => novel.genreNames?.[slug] ?? slug;

/* ---------------------------------------------------------------------------
   Badge บนปก (ส่วนที่ 6.3)
   ใหม่ = ชมพู · HOT = gradient · จบแล้ว = เทา
   --------------------------------------------------------------------------- */
function CoverBadge({ novel }: { novel: Novel }) {
  if (novel.isNew) {
    return (
      <span className="rounded-[8px] bg-[var(--brand-pink)] px-2 py-0.5 text-[11px] font-semibold text-white shadow-[var(--sh-1)]">
        ใหม่
      </span>
    );
  }
  if (novel.featured) {
    return (
      <span className="rounded-[8px] bg-[image:var(--grad-hot)] px-2 py-0.5 text-[11px] font-semibold text-white shadow-[var(--sh-1)]">
        HOT
      </span>
    );
  }
  if (novel.status === "completed") {
    return (
      <span className="rounded-[8px] bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">จบแล้ว</span>
    );
  }
  return null;
}

/** chip แนว — สีฟ้าอ่อนตามสเปก ใช้ --brand-blue-on-light เพื่อให้ contrast ผ่าน */
function GenreChip({ label }: { label: string }) {
  return (
    <span className="rounded-[8px] bg-[var(--brand-blue)]/12 px-1.5 py-0.5 text-[11px] font-medium text-[var(--brand-blue-on-light)]">
      {label}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   การ์ดมาตรฐาน — ใช้ในทุก content row
   ขนาด: mobile 132 / tablet 152 / desktop 168 (ส่วนที่ 6.3)
   --------------------------------------------------------------------------- */
export function NovelCard({
  novel,
  progress,
  fluid = false,
  className
}: {
  novel: Novel;
  progress?: number;
  /** เต็มความกว้างของ cell — ใช้ในหน้า grid เช่น Browse (ความกว้างคงที่ใช้กับแถวเลื่อน) */
  fluid?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative",
        fluid ? "w-full" : "w-[132px] shrink-0 sm:w-[152px] lg:w-[168px]",
        className
      )}
    >
      {/* ปุ่มบุ๊กมาร์กต้องอยู่นอก <Link> — ห้ามซ้อน interactive element (a11y) */}
      <div className="absolute right-2 top-2 z-10 opacity-100 transition-opacity duration-[var(--dur-base)] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <BookmarkToggle slug={novel.slug} compact />
      </div>

      <Link href={`/novel/${novel.slug}`} prefetch className="block">
        {/* aspect 2:3 ตายตัว  CLS 0 (ส่วนที่ 4 ข้อ 7) */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] bg-muted shadow-[var(--sh-1)] transition-all duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:-translate-y-1 group-hover:shadow-[var(--sh-2)]">
          <Image
            src={novel.cover}
            alt={`ปกนิยาย ${novel.thaiTitle}`}
            fill
            sizes="(max-width: 640px) 132px, (max-width: 1024px) 152px, 168px"
            className="object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
          />
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <CoverBadge novel={novel} />
            {novel.hasPaidChapters ? (
              <span className="flex w-fit items-center gap-1 rounded-[8px] bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                <Coins className="h-3 w-3" />
                มีตอนจำกัดการเข้าถึง
              </span>
            ) : null}
          </div>
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{novel.thaiTitle}</h3>

        <div className="tabular mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-[var(--brand-pink)] text-[var(--brand-pink)]" />
            {novel.rating}
          </span>
          <span aria-hidden>·</span>
          <span>ตอนที่ {novel.chapters}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{novel.updatedAt}</span>
        </div>
      </Link>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {novel.genres.slice(0, 2).map((slug) => (
          <Link key={slug} href={`/genre/${slug}`} className="rounded-[8px]">
            <GenreChip label={genreNameOf(novel, slug)} />
          </Link>
        ))}
      </div>

      {typeof progress === "number" ? (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[image:var(--grad-primary)]" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

/* ---------------------------------------------------------------------------
   Ranking card — เลขอันดับตัวใหญ่ซ้อนหลังปก (ส่วนที่ 6.3)
   --------------------------------------------------------------------------- */
export function RankingCard({ novel, rank }: { novel: Novel; rank: number }) {
  const topThree = rank <= 3;

  return (
    <article className="group flex w-[196px] shrink-0 items-end gap-1 sm:w-[220px]">
      <span
        aria-hidden
        className={cn(
          "-mr-2 select-none font-sans text-[64px] font-extrabold leading-[0.8] tracking-tighter",
          topThree ? "bg-[image:var(--grad-hot)] bg-clip-text text-transparent opacity-90" : "text-[var(--brand-primary)] opacity-[0.18]"
        )}
      >
        {rank}
      </span>

      <div className="min-w-0 flex-1">
        <Link href={`/novel/${novel.slug}`} prefetch className="block">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[12px] bg-muted shadow-[var(--sh-1)] transition-all duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:-translate-y-1 group-hover:shadow-[var(--sh-2)]">
            <Image
              src={novel.cover}
              alt={`ปกนิยาย ${novel.thaiTitle}`}
              fill
              sizes="140px"
              className="object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
            />
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{novel.thaiTitle}</h3>
          <p className="tabular mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-[var(--brand-pink)] text-[var(--brand-pink)]" />
            {novel.rating}
            <span aria-hidden>·</span>
            <Eye className="h-3 w-3" />
            {formatNumber(novel.views)}
          </p>
        </Link>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------------------------
   แถวแนวนอน — ใช้ในชั้นหนังสือ / อ่านต่อ / อัปเดตล่าสุด
   list view เหมาะกับข้อมูลเยอะกว่า grid (ส่วนที่ 6.8)
   --------------------------------------------------------------------------- */
export function NovelListItem({
  novel,
  href,
  chapterLabel,
  progress,
  meta,
  action
}: {
  novel: Novel;
  href?: string;
  chapterLabel?: string;
  progress?: number;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <article className="group flex gap-3 rounded-[16px] border border-border bg-card p-3 transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--sh-2)]">
      <Link href={href ?? `/novel/${novel.slug}`} prefetch className="shrink-0">
        <div className="relative aspect-[2/3] w-16 overflow-hidden rounded-[12px] bg-muted">
          <Image src={novel.cover} alt={`ปกนิยาย ${novel.thaiTitle}`} fill sizes="64px" className="object-cover" />
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <Link href={href ?? `/novel/${novel.slug}`} prefetch className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-semibold">{novel.thaiTitle}</h3>
        </Link>

        <p className="tabular line-clamp-1 text-xs text-muted-foreground">
          {chapterLabel ?? `${novel.chapters} ตอน`}
          {meta ? <> · {meta}</> : null}
        </p>

        {typeof progress === "number" ? (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[image:var(--grad-primary)]" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <span className="tabular shrink-0 text-[11px] text-muted-foreground">{progress}%</span>
          </div>
        ) : null}

        {action ? <div className="mt-1.5">{action}</div> : null}
      </div>
    </article>
  );
}

/** ใช้ในผลค้นหา/แถบข้าง — เล็กที่สุด */
export function NovelMiniCard({ novel }: { novel: Novel }) {
  return (
    <Link
      href={`/novel/${novel.slug}`}
      prefetch
      className="flex min-w-0 items-center gap-3 rounded-[12px] p-2 transition-colors hover:bg-muted"
    >
      <div className="relative h-15 w-10 shrink-0 overflow-hidden rounded-[8px] bg-muted" style={{ aspectRatio: "2 / 3" }}>
        <Image src={novel.cover} alt={`ปกนิยาย ${novel.thaiTitle}`} fill sizes="40px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{novel.thaiTitle}</p>
        <p className="tabular truncate text-xs text-muted-foreground">
          {genreNameOf(novel, novel.genres[0])} · {formatNumber(novel.views)} ครั้ง
        </p>
      </div>
    </Link>
  );
}

/* ---------- ของเดิมที่หน้าอื่นยังเรียกใช้อยู่ — คงชื่อไว้ ---------- */

export function NovelCardHorizontal({ novel, href }: { novel: Novel; href?: string }) {
  return <NovelListItem novel={novel} href={href} meta={statusLabel[novel.status]} />;
}

export function NovelRankingItem({ novel, rank }: { novel: Novel; rank: number }) {
  return (
    <Link
      href={`/novel/${novel.slug}`}
      prefetch
      className="group grid grid-cols-[32px_44px_1fr] items-center gap-3 rounded-[12px] border border-border bg-card p-2 transition-shadow hover:shadow-[var(--sh-2)]"
    >
      <span
        className={cn(
          "tabular text-center text-lg font-extrabold",
          rank <= 3 ? "bg-[image:var(--grad-hot)] bg-clip-text text-transparent" : "text-muted-foreground"
        )}
      >
        {rank}
      </span>
      <div className="relative aspect-[2/3] w-11 overflow-hidden rounded-[8px] bg-muted">
        <Image src={novel.cover} alt={`ปกนิยาย ${novel.thaiTitle}`} fill sizes="44px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{novel.thaiTitle}</p>
        <p className="tabular truncate text-xs text-muted-foreground">
          {genreNameOf(novel, novel.genres[0])} · {novel.chapters} ตอน
        </p>
      </div>
    </Link>
  );
}
