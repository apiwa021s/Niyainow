"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, RefreshCcw, Star } from "lucide-react";
import { type CSSProperties } from "react";

import { ReaderClassIcon } from "@/components/onboarding/reader-class-icon";
import { ReaderRpgDashboard } from "@/components/onboarding/reader-rpg-dashboard";
import { useReaderClassProfile } from "@/components/onboarding/use-reader-class-profile";
import {
  getReaderClass,
  type ReaderClassProfile,
} from "@/lib/onboarding/reader-class";
import type { Novel } from "@/types/novel";
import type { ReaderRpgSummary } from "@/services/reader-rpg-service";
import type { ReaderMissionDashboard } from "@/lib/onboarding/reader-missions";
import styles from "./personalized-reader-page.module.css";

function novelSearchText(novel: Novel) {
  return [
    ...novel.genres,
    ...novel.tags,
    ...Object.values(novel.genreNames ?? {}),
    ...Object.values(novel.tagNames ?? {}),
  ].join(" ").toLocaleLowerCase("th");
}

function classAffinity(
  novel: Novel,
  readerClass: NonNullable<ReturnType<typeof getReaderClass>>,
) {
  const genreScore = novel.genres.reduce(
    (score, genre) => score + (readerClass.recommendationGenres.some((candidate) => candidate === genre) ? 5 : 0),
    0,
  );
  const searchText = novelSearchText(novel);
  const tasteScore = readerClass.tastes.reduce(
    (score, taste) => score + (searchText.includes(taste.toLocaleLowerCase("th")) ? 2 : 0),
    0,
  );
  return genreScore + tasteScore;
}

function rankByClasses(
  novels: Novel[],
  mainClass: NonNullable<ReturnType<typeof getReaderClass>>,
  subClasses: NonNullable<ReturnType<typeof getReaderClass>>[] = [],
) {
  return novels
    .map((novel, index) => ({
      novel,
      index,
      score: classAffinity(novel, mainClass) * 2
        + subClasses.reduce((score, subClass) => score + classAffinity(novel, subClass), 0),
    }))
    .sort((left, right) => (
      right.score - left.score
      || right.novel.rating - left.novel.rating
      || right.novel.views - left.novel.views
      || left.index - right.index
    ));
}

function paceShelf(
  ranked: ReturnType<typeof rankByClasses>,
  pace: string | undefined,
) {
  const copy = [...ranked];
  if (pace === "binge") {
    copy.sort((left, right) => right.novel.chapters - left.novel.chapters || right.score - left.score);
  } else if (pace === "stack") {
    copy.sort((left, right) => Number(right.novel.status === "completed") - Number(left.novel.status === "completed") || right.novel.chapters - left.novel.chapters);
  } else if (pace === "daily") {
    copy.sort((left, right) => Number(Boolean(right.novel.isNew)) - Number(Boolean(left.novel.isNew)) || (left.novel.updatedHoursAgo ?? Number.MAX_SAFE_INTEGER) - (right.novel.updatedHoursAgo ?? Number.MAX_SAFE_INTEGER));
  } else if (pace === "complete") {
    copy.sort((left, right) => Number(right.novel.status === "completed") - Number(left.novel.status === "completed") || right.novel.rating - left.novel.rating);
  }
  return copy.slice(0, 12).map((item) => item.novel);
}

const PACE_COPY: Record<string, { title: string; description: string }> = {
  binge: { title: "พร้อมอ่านยาวคืนนี้", description: "เรื่องตอนเยอะที่เหมาะกับนักอ่านรวดเดียวอย่างคุณ" },
  stack: { title: "ดองให้เต็มคลัง แล้วค่อยลุย", description: "เรื่องยาวและเรื่องจบที่สะสมไว้รอวันว่างได้" },
  daily: { title: "ตอนใหม่สำหรับวันนี้", description: "เรื่องใหม่และเรื่องที่เพิ่งอัปเดต คัดไว้ให้กลับมาทุกวัน" },
  complete: { title: "จบแล้ว อ่านได้ยาว ๆ", description: "ไม่ต้องค้างกลางทาง—เริ่มวันนี้และไปถึงตอนจบได้เลย" },
};

function NovelCard({ novel, rank }: { novel: Novel; rank?: number }) {
  const genre = novel.genres.map((slug) => novel.genreNames?.[slug]).find(Boolean);
  return (
    <article className={styles.novelCard}>
      <Link href={`/novel/${novel.slug}`} transitionTypes={["nav-forward"]} className={styles.coverLink}>
        <Image src={novel.cover} alt="" fill sizes="(max-width: 640px) 126px, (max-width: 1100px) 146px, 164px" className={styles.cover} />
        {rank ? <span className={styles.rank}>#{rank}</span> : null}
        {novel.isNew ? <span className={styles.newBadge}>ใหม่</span> : null}
      </Link>
      <Link href={`/novel/${novel.slug}`} className={styles.novelTitle}>{novel.thaiTitle}</Link>
      <p className={styles.novelGenre}>{genre || "เรื่องแนะนำ"}</p>
      <p className={styles.novelStats}>
        <span><Star aria-hidden /> {novel.rating.toFixed(1)}</span>
        <span><BookOpen aria-hidden /> {novel.chapters} ตอน</span>
      </p>
    </article>
  );
}

function NovelShelf({
  title,
  description,
  novels,
  href,
}: {
  title: string;
  description: string;
  novels: Novel[];
  href: string;
}) {
  if (!novels.length) return null;
  return (
    <section className={styles.shelf} aria-label={title}>
      <div className={styles.shelfHeader}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Link href={href}>ดูทั้งหมด <ArrowRight aria-hidden /></Link>
      </div>
      <div className={styles.shelfTrack}>
        {novels.map((novel, index) => <NovelCard key={novel.slug} novel={novel} rank={index < 3 ? index + 1 : undefined} />)}
      </div>
    </section>
  );
}

function PersonalizeHydrationSkeleton() {
  return (
    <main id="main" className={styles.page} aria-busy="true">
      <div className={styles.hydrationSkeleton} />
    </main>
  );
}

export function PersonalizedReaderPage({
  novels,
  initialProfile,
  canPersist,
  initialRpg,
  initialMissionDashboard,
}: {
  novels: Novel[];
  initialProfile: ReaderClassProfile | null;
  canPersist: boolean;
  initialRpg: ReaderRpgSummary | null;
  initialMissionDashboard: ReaderMissionDashboard | null;
}) {
  const { profile, hydrated } = useReaderClassProfile({ initialProfile, canPersist });

  if (!hydrated) return <PersonalizeHydrationSkeleton />;

  const mainClass = getReaderClass(profile?.classId);
  const firstSubClass = getReaderClass(profile?.subClassIds[0]);
  const secondSubClass = getReaderClass(profile?.subClassIds[1]);
  const subClasses = firstSubClass && secondSubClass ? [firstSubClass, secondSubClass] : [];
  const mainMastery = initialRpg?.classes.find((item) => item.classId === mainClass?.id);
  const subMasteries = subClasses.map((readerClass) => initialRpg?.classes.find((item) => item.classId === readerClass.id));

  if (!profile || !mainClass || !firstSubClass || !secondSubClass) {
    return (
      <main id="main" className={styles.page}>
        <section className={styles.emptyState}>
          <span><Compass aria-hidden /></span>
          <h1>โลกนิยายของคุณยังไม่ได้ถูกปลุก</h1>
          <p>ค้นหา Reader Class ก่อน แล้วเราจะสร้างหน้าแนะนำที่เข้ากับคุณโดยเฉพาะ</p>
          <Link href="/onboarding">ค้นหา Class ของฉัน <ArrowRight aria-hidden /></Link>
        </section>
      </main>
    );
  }

  const ranked = rankByClasses(novels, mainClass, subClasses);
  const matched = ranked.filter((item) => item.score > 0);
  const personalizedPool = [...matched, ...ranked.filter((item) => item.score === 0)];
  const mainNovels = [...rankByClasses(novels, mainClass)]
    .filter((item) => item.score > 0)
    .slice(0, 12)
    .map((item) => item.novel);
  const blendedNovels = personalizedPool.slice(0, 12).map((item) => item.novel);
  const pace = profile.answers.pace;
  const paceCopy = PACE_COPY[pace ?? ""] ?? {
    title: "อีกเส้นทางที่น่าจะใช่",
    description: "เรียงจากจังหวะการอ่านและโลกที่คุณเลือก",
  };
  const readingPaceNovels = paceShelf(personalizedPool, pace);
  const allGenres = [...new Set([
    ...mainClass.recommendationGenres,
    ...subClasses.flatMap((readerClass) => readerClass.recommendationGenres),
  ])];
  const browseHref = `/novels?genre=${allGenres.join(",")}`;
  const equippedCosmetics = new Map(
    (initialMissionDashboard?.cosmetics.items ?? [])
      .filter((item) => item.equipped)
      .map((item) => [item.slot, item]),
  );
  const profileFrame = equippedCosmetics.get("profile_frame");
  const cardEffect = equippedCosmetics.get("card_effect");
  const avatarEffect = equippedCosmetics.get("avatar_effect");
  const readerTitle = equippedCosmetics.get("reader_title");
  const badge = equippedCosmetics.get("badge");
  const background = equippedCosmetics.get("background");
  const cosmeticAccent = profileFrame?.config.accent ?? background?.config.accent ?? mainClass.accent;
  const pageStyle = {
    "--personal-accent": cosmeticAccent,
    "--cosmetic-secondary": profileFrame?.config.accentSecondary ?? background?.config.accentSecondary ?? "#f5bd64",
  } as CSSProperties;

  return (
    <main id="main" className={styles.page} style={pageStyle}>
      <section
        className={styles.hero}
        data-frame={profileFrame ? "equipped" : undefined}
        data-pattern={background?.config.pattern ?? "none"}
        data-animation={cardEffect?.config.animation ?? profileFrame?.config.animation ?? background?.config.animation ?? "none"}
      >
        <div className={styles.heroPattern} aria-hidden />
        <div className={styles.heroCopy}>
          <div className={styles.classHeading}>
            <ReaderClassIcon src={mainClass.icon} className={styles.heroIcon} sizes="72px" />
            <div>
              <h1>{mainClass.name}</h1>
            </div>
          </div>
          <p className={styles.heroTitle}>
            Reader Lv.{initialRpg?.reader.level ?? 1} · {readerTitle?.config.title ?? mainMastery?.title ?? mainClass.title}
            {badge?.config.badgeText ? <span className={styles.cosmeticBadge}>{badge.config.badgeText}</span> : null}
          </p>
          <p className={styles.heroDescription}>{mainClass.description}</p>
          <div className={styles.heroTags}>
            {mainClass.tastes.map((taste) => <span key={taste}>#{taste}</span>)}
          </div>
          <div className={styles.heroActions}>
            <Link href={browseHref}>สำรวจโลกของฉัน <ArrowRight aria-hidden /></Link>
            <Link href="/onboarding"><RefreshCcw aria-hidden /> ปรับ Class ใหม่</Link>
          </div>
        </div>

        <div className={styles.heroArt} data-animation={avatarEffect?.config.animation ?? "none"} aria-hidden>
          <span className={styles.artHalo} />
          <Image src={firstSubClass.image} alt="" width={1086} height={1448} sizes="(max-width: 820px) 46vw, 28vw" className={styles.subCharacter} />
          <Image src={mainClass.image} alt="" width={1086} height={1448} sizes="(max-width: 820px) 76vw, 38vw" className={styles.mainCharacter} />
        </div>
      </section>

      <section className={styles.identityGrid} aria-label="Reader identity">
        <article>
          <span>MAIN CLASS</span>
          <div><ReaderClassIcon src={mainClass.icon} sizes="44px" /><p><strong>{mainClass.name} Lv.{mainMastery?.level ?? 1}</strong><small>{mainMastery?.title ?? mainClass.title}</small></p></div>
        </article>
        <article>
          <span>SUB CLASSES</span>
          <div><ReaderClassIcon src={firstSubClass.icon} sizes="44px" /><p><strong>{subClasses.map((item, index) => `${item.name} Lv.${subMasteries[index]?.level ?? 1}`).join(" · ")}</strong><small>พลังเสริมของรสนิยมคุณทั้งสองสาย</small></p></div>
        </article>
        <article>
          <span>HIDDEN TRAIT</span>
          <div><i>{profile.hiddenTraitEmoji}</i><p><strong>{profile.hiddenTrait}</strong><small>จังหวะเฉพาะตัวของคุณ</small></p></div>
        </article>
      </section>

      {initialMissionDashboard ? (
        <ReaderRpgDashboard
          initialDashboard={initialMissionDashboard}
          currentStreakDays={initialRpg?.reader.currentStreakDays ?? 0}
          prestige={mainMastery?.prestige ?? 0}
        />
      ) : null}

      <div className={styles.introRow}>
        <div><h2>เส้นทางการอ่านที่สร้างเพื่อคุณ</h2></div>
        <p>ระบบนำ Class หลัก รสนิยมรอง และนิสัยการอ่านมาจัดลำดับใหม่ โดยไม่ล็อกคุณไว้กับแนวเดียว</p>
      </div>

      <div className={styles.shelves}>
        <NovelShelf
          title={`เรื่องที่ ${mainClass.name} ไม่ควรพลาด`}
          description={`เน้น ${mainClass.tastes.slice(0, 3).join(" · ")}`}
          novels={mainNovels}
          href={`/novels?genre=${mainClass.recommendationGenres.join(",")}`}
        />
        <NovelShelf
          title={`${mainClass.name} × ${subClasses.map((item) => item.name).join(" × ")}`}
          description="จุดตัดระหว่างโลกหลักและรสนิยมรองของคุณ"
          novels={blendedNovels}
          href={browseHref}
        />
        <NovelShelf
          title={paceCopy.title}
          description={paceCopy.description}
          novels={readingPaceNovels}
          href={pace === "complete" ? "/novels?status=completed" : browseHref}
        />
      </div>

      <section className={styles.homeCta}>
        <div><h2>ให้ NovelNow จำ Class นี้ไว้ใน Home</h2><p>Feed หน้าแรกจะใช้ผลชุดเดียวกันเพื่อวางนิยายที่น่าจะใช่ไว้ก่อนเสมอ</p></div>
        <Link href="/">เข้าสู่ Home ของฉัน <ArrowRight aria-hidden /></Link>
      </section>
    </main>
  );
}
