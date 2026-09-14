"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RefreshCcw, Sparkles } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { ReaderClassIcon } from "@/components/onboarding/reader-class-icon";
import {
  READER_CLASS_STORAGE_KEY,
  getReaderClass,
  parseReaderClassProfile,
} from "@/lib/onboarding/reader-class";
import type { Novel } from "@/types/novel";

function subscribeToReaderClass(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === READER_CLASS_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getReaderClassSnapshot() {
  return window.localStorage.getItem(READER_CLASS_STORAGE_KEY) ?? "";
}

function scoreNovel(novel: Novel, mainGenres: readonly string[], subGenres: readonly string[]) {
  return novel.genres.reduce((score, genre) => (
    score + (mainGenres.includes(genre) ? 3 : 0) + (subGenres.includes(genre) ? 2 : 0)
  ), 0);
}

export function ReaderClassHome({ novels }: { novels: Novel[] }) {
  const rawProfile = useSyncExternalStore(subscribeToReaderClass, getReaderClassSnapshot, () => "");
  const profile = useMemo(() => parseReaderClassProfile(rawProfile), [rawProfile]);
  const mainClass = getReaderClass(profile?.classId);
  const subClass = getReaderClass(profile?.subClassId);

  const recommended = useMemo(() => {
    if (!mainClass || !subClass) return [];
    return novels
      .map((novel, index) => ({ novel, index, score: scoreNovel(novel, mainClass.recommendationGenres, subClass.recommendationGenres) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 10)
      .map((item) => item.novel);
  }, [mainClass, novels, subClass]);

  if (!profile || !mainClass || !subClass) {
    return (
      <section className="relative isolate overflow-hidden rounded-(--r-lg) border border-accent-base/25 bg-card px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-[radial-gradient(circle_at_right,color-mix(in_srgb,var(--brand-primary)_14%,transparent),transparent_68%)]" aria-hidden />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-(--brand-emphasis)">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> READER CLASS
            </span>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">คุณจะเป็นนักอ่านสายไหน?</h2>
            <p className="mt-1 text-sm leading-6 text-(--text-secondary)">เลือก 3 แนว ตอบ 3 คำถาม แล้วปลุก Class ที่ซ่อนอยู่ในตัวคุณ</p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-accent-base px-5 text-sm font-semibold text-accent-on shadow-[var(--sh-brand)] transition hover:bg-accent-hover"
          >
            ค้นหา Class ของฉัน <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

  const genreHref = `/novels?genre=${[...new Set([...mainClass.recommendationGenres, ...subClass.recommendationGenres])].join(",")}`;

  return (
    <section className="overflow-hidden rounded-(--r-lg) border border-accent-base/30 bg-card">
      <div className="relative isolate min-h-44 overflow-hidden px-5 py-5 sm:px-7 lg:min-h-52 lg:px-9 lg:py-7">
        <div
          className="absolute inset-0 -z-20 opacity-90"
          style={{ background: `radial-gradient(circle at 78% 30%, color-mix(in srgb, ${mainClass.accent} 22%, transparent), transparent 42%), linear-gradient(115deg, var(--card), color-mix(in srgb, ${mainClass.accent} 8%, var(--card)))` }}
          aria-hidden
        />
        <Image
          src={mainClass.image}
          alt=""
          width={1086}
          height={1448}
          sizes="(max-width: 640px) 190px, 320px"
          className="absolute -bottom-36 right-0 -z-10 h-[320px] w-auto object-contain opacity-50 drop-shadow-[0_20px_20px_rgba(0,0,0,0.28)] sm:-bottom-48 sm:right-[4%] sm:h-[450px] sm:opacity-70 lg:-bottom-56 lg:h-[520px]"
        />
        <div className="max-w-[680px]">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-(--brand-emphasis)">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> YOUR WORLD IS READY
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">โลกของ{mainClass.name}กำลังเปิดให้คุณ</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-(--text-secondary)">
            เราคัดเรื่องสาย {mainClass.tastes.slice(0, 2).join(" · ")} ผสมกลิ่นอาย {subClass.name} มาไว้แถวแรกแล้ว
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-base/25 bg-accent-subtle px-3 py-1.5 font-semibold text-foreground">Main <ReaderClassIcon src={mainClass.icon} className="h-5 w-5" sizes="20px" /> {mainClass.name}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-(--text-secondary)">Sub <ReaderClassIcon src={subClass.icon} className="h-5 w-5" sizes="20px" /> {subClass.name}</span>
            <span className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-(--text-secondary)">{profile.hiddenTraitEmoji} {profile.hiddenTrait}</span>
          </div>
        </div>
        <Link href="/onboarding" className="absolute right-3 top-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-background/70 px-3 text-xs font-semibold text-(--text-secondary) backdrop-blur-sm transition hover:text-foreground sm:right-5 sm:top-5">
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden /> ทำแบบทดสอบใหม่
        </Link>
      </div>

      {recommended.length ? (
        <div className="border-t border-border px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-(--brand-emphasis)">PERSONALIZED FIRST FEED</p>
              <h3 className="mt-0.5 text-lg font-semibold">เรื่องแรกที่ Class ของคุณเลือกให้</h3>
            </div>
            <Link href={genreHref} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-(--brand-emphasis) hover:underline">
              ดูทั้งหมด <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
            {recommended.map((novel) => (
              <article key={novel.slug} className="w-[120px] shrink-0 snap-start sm:w-[138px]">
                <Link href={`/novel/${novel.slug}`} transitionTypes={["nav-forward"]} className="group block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-[7px] bg-muted ring-1 ring-border">
                    <Image src={novel.cover} alt="" fill sizes="138px" className="object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transform-none" />
                  </div>
                  <h4 className="mt-1.5 truncate text-sm font-semibold group-hover:text-(--brand-emphasis)">{novel.thaiTitle}</h4>
                  <p className="mt-0.5 truncate text-[11px] text-(--text-tertiary)">
                    {novel.genres.slice(0, 2).map((slug) => novel.genreNames?.[slug]).filter(Boolean).join(" · ")}
                  </p>
                </Link>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-5 py-4 text-sm text-(--text-secondary)">
          โลกของคุณพร้อมแล้ว — นิยายที่ตรงกับ Class จะปรากฏตรงนี้เมื่อมีเรื่องใหม่เข้าคลัง
        </div>
      )}
    </section>
  );
}
