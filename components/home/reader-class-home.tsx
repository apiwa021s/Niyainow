"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { ArrowRight, RefreshCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ContentRow, RowItem } from "@/components/home/content-row";
import { ReaderClassIcon } from "@/components/onboarding/reader-class-icon";
import { useReaderClassProfile } from "@/components/onboarding/use-reader-class-profile";
import {
  getReaderClass,
  type ReaderClassProfile,
} from "@/lib/onboarding/reader-class";
import type { Novel } from "@/types/novel";
import type { ReaderRpgSummary } from "@/services/reader-rpg-service";

import styles from "./reader-class-home.module.css";

function scoreNovel(novel: Novel, mainGenres: readonly string[], subGenres: readonly string[]) {
  return novel.genres.reduce((score, genre) => (
    score + (mainGenres.includes(genre) ? 3 : 0) + (subGenres.includes(genre) ? 2 : 0)
  ), 0);
}

export function ReaderClassHome({
  novels,
  initialProfile,
  canPersist,
  initialRpg,
}: {
  novels: Novel[];
  initialProfile: ReaderClassProfile | null;
  canPersist: boolean;
  initialRpg: ReaderRpgSummary | null;
}) {
  const { profile } = useReaderClassProfile({ initialProfile, canPersist });
  const mainClass = getReaderClass(profile?.classId);
  const firstSubClass = getReaderClass(profile?.subClassIds[0]);
  const secondSubClass = getReaderClass(profile?.subClassIds[1]);
  const subClasses = firstSubClass && secondSubClass ? [firstSubClass, secondSubClass] : [];
  const mainMastery = initialRpg?.classes.find((item) => item.classId === mainClass?.id);
  const subMasteries = subClasses.map((readerClass) => initialRpg?.classes.find((item) => item.classId === readerClass.id));

  const recommended = useMemo(() => {
    if (!mainClass || !firstSubClass || !secondSubClass) return [];
    const subClassGenres = [
      ...firstSubClass.recommendationGenres,
      ...secondSubClass.recommendationGenres,
    ];
    return novels
      .map((novel, index) => ({ novel, index, score: scoreNovel(novel, mainClass.recommendationGenres, subClassGenres) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 10)
      .map((item) => item.novel);
  }, [firstSubClass, mainClass, novels, secondSubClass]);

  if (!profile || !mainClass || !firstSubClass || !secondSubClass) {
    return (
      <section className={styles.emptyState}>
        <div className={styles.emptyGlow} aria-hidden />
        <div>
          <h2>คุณจะเป็นนักอ่านสายไหน?</h2>
          <p>เลือก 3 แนว ตอบ 3 คำถาม แล้วปลุก Class ที่ซ่อนอยู่ในตัวคุณ</p>
        </div>
        <Link href="/onboarding" className={styles.primaryButton}>
          ค้นหา Class ของฉัน <ArrowRight aria-hidden />
        </Link>
      </section>
    );
  }

  const genreHref = `/novels?genre=${[...new Set([
    ...mainClass.recommendationGenres,
    ...firstSubClass.recommendationGenres,
    ...secondSubClass.recommendationGenres,
  ])].join(",")}`;
  const accentStyle = { "--class-accent": mainClass.accent } as CSSProperties;

  return (
    <section className={styles.experience} style={accentStyle}>
      <div className={styles.hero}>
        <div className={styles.copy}>
          <h2>โลกของ{mainClass.name}กำลังเปิดให้คุณ</h2>
          <p className={styles.intro}>
            เราคัดเรื่องสาย {mainClass.tastes.slice(0, 2).join(" · ")} ผสมกลิ่นอาย {subClasses.map((item) => item.name).join(" และ ")} มาไว้ให้คุณแล้ว
          </p>

          <div className={styles.identityBar} aria-label="ตัวตนนักอ่านของคุณ">
            <div className={styles.identityItem}>
              <ReaderClassIcon src={mainClass.icon} className={styles.classIcon} sizes="36px" />
              <span>
                <small>READER LV.{initialRpg?.reader.level ?? 1} · MAIN LV.{mainMastery?.level ?? 1}</small>
                <strong>{mainClass.name}</strong>
              </span>
            </div>
            <div className={styles.identityItem}>
              <ReaderClassIcon src={firstSubClass.icon} className={styles.classIcon} sizes="36px" />
              <span>
                <small>SUB CLASSES</small>
                <strong>{subClasses.map((item, index) => `${item.name} Lv.${subMasteries[index]?.level ?? 1}`).join(" · ")}</strong>
              </span>
            </div>
            <div className={`${styles.identityItem} ${styles.traitItem}`}>
              <span className={styles.traitIcon} aria-hidden>{profile.hiddenTraitEmoji}</span>
              <span>
                <small>HIDDEN TRAIT</small>
                <strong>{profile.hiddenTrait}</strong>
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/personalize" className={styles.primaryButton}>
              เปิดหน้า Personalize <ArrowRight aria-hidden />
            </Link>
            <Link href="/onboarding" className={styles.secondaryButton}>
              <RefreshCcw aria-hidden /> ทำแบบทดสอบใหม่
            </Link>
          </div>
        </div>

        <div className={styles.art} aria-hidden>
          <div className={styles.artGlow} />
          <Image
            src={mainClass.image}
            alt=""
            width={1086}
            height={1448}
            sizes="(max-width: 639px) 260px, (max-width: 1023px) 34vw, 420px"
            className={styles.character}
          />
          <div className={styles.artFade} />
        </div>
      </div>

      {recommended.length ? (
        <div className={styles.feed}>
          <ContentRow
            title="เรื่องแรกที่ Class ของคุณเลือกให้"
            description={`คัดจากแนวของ ${mainClass.name} และ ${subClasses.map((item) => item.name).join(" · ")}`}
            href={genreHref}
            bleed={false}
          >
            {recommended.map((novel) => (
              <RowItem key={novel.slug} className={styles.novelItem}>
                <article>
                  <Link
                    href={`/novel/${novel.slug}`}
                    transitionTypes={["nav-forward"]}
                    className={styles.novelLink}
                  >
                    <div className={styles.cover}>
                      <Image
                        src={novel.cover}
                        alt=""
                        fill
                        sizes="(max-width: 639px) 132px, (max-width: 1023px) 148px, 160px"
                        className={styles.coverImage}
                      />
                    </div>
                    <h4>{novel.thaiTitle}</h4>
                    <p>
                      {novel.genres
                        .slice(0, 2)
                        .map((slug) => novel.genreNames?.[slug])
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </Link>
                </article>
              </RowItem>
            ))}
          </ContentRow>
        </div>
      ) : (
        <div className={styles.emptyFeed}>
          โลกของคุณพร้อมแล้ว — นิยายที่ตรงกับ Class จะปรากฏตรงนี้เมื่อมีเรื่องใหม่เข้าคลัง
        </div>
      )}
    </section>
  );
}
