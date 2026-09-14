import {
  READER_CLASSES,
  type ReaderClassId,
} from "./reader-class";

export const READER_MAX_LEVEL = 50;
export const READING_EXP_DAILY_CAP = 500;
export const MAIN_CLASS_BONUS_BPS = 1_000;
export const EXP_MILLI_SCALE = 1_000;

const TITLE_LEVELS = [1, 5, 10, 20, 35, 50] as const;

export const READER_CLASS_TITLES: Record<ReaderClassId, readonly string[]> = {
  martial: ["ผู้เริ่มฝึกตน", "ศิษย์สำนัก", "จอมยุทธ์", "ปรมาจารย์", "เซียน", "ผู้ท้าทายสวรรค์"],
  bl: ["นักเดินเรือมือใหม่", "ลูกเรือแห่งด้อม", "นักจับโมเมนต์", "กัปตันเรือ", "เจ้าแห่งด้อม", "ตำนานเรือไม่มีวันล่ม"],
  yuri: ["ผู้พบสวนบุปผา", "ผู้เฝ้าดอกไม้", "นักถักสัมพันธ์", "ผู้พิทักษ์สวน", "เจ้าแห่งบุปผา", "ผู้พิทักษ์สวนแห่งนิรันดร์"],
  romance: ["ผู้สัมผัสรัก", "นักตามหารัก", "นักล่าหัวใจ", "เจ้าแห่งโรแมนซ์", "ผู้ครองหัวใจ", "ตำนานแห่งรักนิรันดร์"],
  dark: ["ผู้ก้าวสู่เงามืด", "ผู้เดินในเงา", "นักอ่านต้องห้าม", "เจ้าแห่งรัตติกาล", "ผู้ครองความมืด", "ราชันแห่งรัตติกาล"],
  reborn: ["ผู้ย้อนชะตา", "ผู้แก้ไขอดีต", "นักพลิกชะตา", "ผู้เขียนโชคชะตา", "ผู้ครองกาลเวลา", "ผู้เปลี่ยนชะตาสวรรค์"],
  isekai: ["นักเดินทางมือใหม่", "ผู้ข้ามประตู", "นักผจญภัยต่างโลก", "จอมเวทพเนจร", "ผู้ท่องมิติ", "มหาจอมเวทแห่งพหุภพ"],
  system: ["New Player", "Adventurer", "Elite Player", "Master Player", "System Breaker", "ผู้พิชิตระบบ"],
  mystery: ["ผู้สังเกตการณ์", "นักแกะรอย", "นักสืบ", "ผู้ไขปริศนา", "นักอ่านความจริง", "ผู้เปิดโปงทุกความลับ"],
  horror: ["ผู้ได้ยินเสียงกระซิบ", "ผู้เดินยามค่ำ", "นักล่าวิญญาณ", "ผู้ท้าทายความตาย", "เจ้าแห่งโลกวิญญาณ", "ผู้เดินระหว่างสองโลก"],
  spicy: ["ผู้เริ่มใจเต้น", "นักอ่านหน้าแดง", "นักล่าโมเมนต์", "เจ้าแห่งแรงดึงดูด", "ราชา/ราชินีรัตติกาล", "ตำนานรักหลังเที่ยงคืน"],
  cozy: ["นักอ่านวันสบาย", "นักจิบชา", "นักอ่านฮีลใจ", "ผู้พิทักษ์วันสบาย", "เซียนแห่งความชิล", "เจ้าแห่งโลกแสนสบาย"],
};

export type LevelProgress = {
  level: number;
  totalExp: number;
  expIntoLevel: number;
  expForNextLevel: number | null;
  progressPercent: number;
};

export type ClassAffinity = {
  classId: ReaderClassId;
  weightMilli: number;
};

export type ClassExpAllocation = ClassAffinity & {
  expMilli: number;
  mainClassBonusBps: number;
};

export function expForNextLevel(currentLevel: number) {
  const level = Math.max(1, Math.min(READER_MAX_LEVEL - 1, Math.floor(currentLevel)));
  return 100 + level * 50;
}

export function totalExpForLevel(level: number) {
  const target = Math.max(1, Math.min(READER_MAX_LEVEL, Math.floor(level)));
  let total = 0;
  for (let current = 1; current < target; current += 1) total += expForNextLevel(current);
  return total;
}

export function levelProgress(totalExp: number): LevelProgress {
  const safeTotal = Math.max(0, Math.floor(totalExp));
  let level = 1;
  let levelStart = 0;

  while (level < READER_MAX_LEVEL) {
    const required = expForNextLevel(level);
    if (safeTotal < levelStart + required) {
      const expIntoLevel = safeTotal - levelStart;
      return {
        level,
        totalExp: safeTotal,
        expIntoLevel,
        expForNextLevel: required,
        progressPercent: Math.min(100, Math.floor((expIntoLevel / required) * 100)),
      };
    }
    levelStart += required;
    level += 1;
  }

  return {
    level: READER_MAX_LEVEL,
    totalExp: safeTotal,
    expIntoLevel: Math.max(0, safeTotal - levelStart),
    expForNextLevel: null,
    progressPercent: 100,
  };
}

export function classLevelProgress(totalExpMilli: number) {
  return levelProgress(Math.floor(Math.max(0, totalExpMilli) / EXP_MILLI_SCALE));
}

export function classTitleFor(classId: ReaderClassId, level: number) {
  const safeLevel = Math.max(1, Math.min(READER_MAX_LEVEL, Math.floor(level)));
  let titleIndex = 0;
  for (let index = 1; index < TITLE_LEVELS.length; index += 1) {
    if (safeLevel < TITLE_LEVELS[index]) break;
    titleIndex = index;
  }
  return READER_CLASS_TITLES[classId][titleIndex];
}

export function readingExpForWordCount(wordCount: number) {
  const words = Math.max(0, Math.floor(wordCount));
  if (words < 1_000) return 6;
  if (words < 2_500) return 10;
  if (words < 4_000) return 14;
  return 18;
}

/** A forgiving anti-farm threshold: about 480 words/minute, bounded at 20s–10m. */
export function minimumActiveReadingSeconds(wordCount: number) {
  return Math.max(20, Math.min(600, Math.ceil(Math.max(0, wordCount) / 8)));
}

export function rereadMultiplierMilli(previousQualifiedReads: number) {
  if (previousQualifiedReads <= 0) return 1_000;
  if (previousQualifiedReads === 1) return 200;
  return 0;
}

function normalizeScores(scores: { classId: ReaderClassId; score: number; order: number }[]) {
  const top = scores
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, 3);
  const total = top.reduce((sum, item) => sum + item.score, 0);
  if (total <= 0) return [];

  const normalized = top.map((item) => {
    const exact = item.score * EXP_MILLI_SCALE / total;
    return { ...item, weightMilli: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let missing = EXP_MILLI_SCALE - normalized.reduce((sum, item) => sum + item.weightMilli, 0);
  normalized
    .slice()
    .sort((left, right) => right.remainder - left.remainder || left.order - right.order)
    .forEach((item) => {
      if (missing <= 0) return;
      const target = normalized.find((candidate) => candidate.classId === item.classId)!;
      target.weightMilli += 1;
      missing -= 1;
    });

  return normalized.map(({ classId, weightMilli }) => ({ classId, weightMilli }));
}

/** Fallback only; curated affinities stored on the novel always take precedence. */
export function inferClassAffinities(genreSlugs: readonly string[]): ClassAffinity[] {
  const genres = new Set(genreSlugs);
  return normalizeScores(READER_CLASSES.map((readerClass, order) => ({
    classId: readerClass.id,
    score: readerClass.recommendationGenres.reduce(
      (score, genre) => score + (genres.has(genre) ? 1 : 0),
      0,
    ),
    order,
  })) as { classId: ReaderClassId; score: number; order: number }[]);
}

export function allocateClassExp(
  readerExp: number,
  affinities: readonly ClassAffinity[],
  mainClassId?: ReaderClassId | null,
): ClassExpAllocation[] {
  const safeReaderExp = Math.max(0, Math.floor(readerExp));
  return affinities
    .filter(({ weightMilli }) => weightMilli > 0)
    .map(({ classId, weightMilli }) => {
      const mainClassBonusBps = classId === mainClassId ? MAIN_CLASS_BONUS_BPS : 0;
      const baseExpMilli = safeReaderExp * weightMilli;
      return {
        classId,
        weightMilli,
        mainClassBonusBps,
        expMilli: Math.round(baseExpMilli * (10_000 + mainClassBonusBps) / 10_000),
      };
    });
}
