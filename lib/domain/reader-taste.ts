/**
 * Reader-facing taste taxonomy (Relationship / Setting / Trope / Heat / Content Warning / Membership).
 *
 * Reuses the exact master lists the writer-side story wizard already defines
 * (lib/studio/master-data.ts) so the reader never disagrees with the writer
 * about what "BL", "Omegaverse" or "คลั่งรัก" mean. These dimensions don't
 * exist as DB columns yet, so `getNovelTaste` derives a stable, presentation-
 * only value from a novel's slug — every reader surface (card, detail,
 * filters, chapter list) can demo the new schema consistently without a
 * backend. Nothing here should be treated as real user/story data.
 */
import {
  CONTENT_WARNINGS,
  HEAT_LEVELS as STUDIO_HEAT_LEVELS,
  RELATIONSHIP_TYPES,
  STORY_SETTINGS,
  TROPES,
  findMaster,
  type HeatLevel as StudioHeatLevelMeta,
} from "@/lib/studio/master-data";

export type HeatLevel = 1 | 2 | 3 | 4 | 5;
export type ChapterAccessState = "free" | "paid" | "purchased" | "early_access" | "members_only";

export const RELATIONSHIP_OPTIONS = RELATIONSHIP_TYPES;
export const SETTING_OPTIONS = STORY_SETTINGS;
export const TROPE_OPTIONS = TROPES;
export const CONTENT_WARNING_OPTIONS = CONTENT_WARNINGS;
export const HEAT_LEVELS: HeatLevel[] = [1, 2, 3, 4, 5];

export const relationshipLabel = (value: string) => findMaster(RELATIONSHIP_OPTIONS, value)?.nameTh ?? value;
export const settingLabel = (value: string) => findMaster(SETTING_OPTIONS, value)?.nameTh ?? value;
export const tropeLabel = (value: string) => findMaster(TROPE_OPTIONS, value)?.nameTh ?? value;
export const warningLabel = (value: string) => findMaster(CONTENT_WARNING_OPTIONS, value)?.nameTh ?? value;

function heatMeta(heat: HeatLevel): StudioHeatLevelMeta {
  return STUDIO_HEAT_LEVELS[heat - 1];
}
export const heatDescriptor = (heat: HeatLevel) => heatMeta(heat).shortTh;
export const heatDescription = (heat: HeatLevel) => heatMeta(heat).descriptionTh;

/** Small, stable string hash (djb2) — deterministic per slug, no crypto needed. */
function hashSlug(slug: string): number {
  let hash = 5381;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 33) ^ slug.charCodeAt(i);
  }
  return Math.abs(hash);
}

function pick<T>(options: readonly T[], seed: number): T {
  return options[seed % options.length];
}

export type NovelTaste = {
  relationship: string;
  setting: string;
  tropes: string[];
  heat: HeatLevel;
  warnings: string[];
  /** Whether the writer offers a membership tier on this story (mock). */
  hasMembership: boolean;
};

/**
 * Deterministic mock taste metadata for a novel. Same slug always returns the
 * same values so the demo feels consistent across page loads and filters.
 */
export function getNovelTaste(novel: { slug: string }): NovelTaste {
  const seed = hashSlug(novel.slug);
  const relationship = pick(RELATIONSHIP_OPTIONS, seed).id;
  const setting = pick(SETTING_OPTIONS, seed >> 2).id;
  const heat = (1 + (seed % 5)) as HeatLevel;
  const tropeCount = 2 + (seed % 3); // 2–4 tropes
  const tropes: string[] = [];
  for (let i = 0; i < tropeCount; i += 1) {
    const candidate = pick(TROPE_OPTIONS, seed + i * 7).id;
    if (!tropes.includes(candidate)) tropes.push(candidate);
  }
  const warningCount = heat >= 4 ? 2 : heat >= 3 ? 1 : 0;
  const warnings: string[] = [];
  for (let i = 0; i < warningCount; i += 1) {
    const candidate = pick(CONTENT_WARNING_OPTIONS, seed + i * 11).id;
    if (!warnings.includes(candidate)) warnings.push(candidate);
  }
  const hasMembership = seed % 5 < 2; // ~40% of stories
  return { relationship, setting, tropes, heat, warnings, hasMembership };
}

export type WriterMembership = {
  name: string;
  priceLabel: string;
  earlyAccessChapters: number;
  perks: string[];
};

/** Deterministic mock membership tier for a novel's writer. */
export function getWriterMembership(novel: { slug: string; author: string }): WriterMembership | null {
  const taste = getNovelTaste(novel);
  if (!taste.hasMembership) return null;
  const seed = hashSlug(novel.slug);
  const price = 39 + (seed % 5) * 20; // 39–119 บาท
  return {
    name: `${novel.author} After Dark`,
    priceLabel: `฿${price} / เดือน`,
    earlyAccessChapters: 3,
    perks: ["อ่านตอนใหม่ก่อนใคร", "ตอนพิเศษสำหรับสมาชิก", "โพสต์เฉพาะสมาชิก", "Member Badge"],
  };
}

/**
 * Presentational-only chapter access override for the demo. Never changes the
 * real free/paid logic — only adds an extra badge on the newest 1–2 chapters
 * of stories whose mock membership is active, to demonstrate Early Access /
 * Members Only states without a real membership backend.
 */
export function getChapterDemoAccess(
  novelSlug: string,
  chapterNumber: number,
  latestChapterNumber: number,
): "early_access" | "members_only" | null {
  if (!getNovelTaste({ slug: novelSlug }).hasMembership) return null;
  if (chapterNumber === latestChapterNumber) return "early_access";
  if (chapterNumber === latestChapterNumber - 1) return "members_only";
  return null;
}

export function parseTropeParam(value?: string): string[] {
  if (!value) return [];
  const valid = new Set(TROPE_OPTIONS.map((o) => o.id));
  return [...new Set(value.split(",").map((v) => v.trim()))].filter((v) => valid.has(v)).slice(0, 6);
}

export function isRelationshipValue(value?: string): value is string {
  return Boolean(value) && RELATIONSHIP_OPTIONS.some((o) => o.id === value);
}

export function isSettingValue(value?: string): value is string {
  return Boolean(value) && SETTING_OPTIONS.some((o) => o.id === value);
}

export type HeatRange = { min: HeatLevel; max: HeatLevel };

/** Parses "3-5" or "4" into a heat range; returns undefined when invalid. */
export function parseHeatParam(value?: string): HeatRange | undefined {
  if (!value) return undefined;
  const match = /^([1-5])(?:-([1-5]))?$/.exec(value.trim());
  if (!match) return undefined;
  const min = Number(match[1]) as HeatLevel;
  const max = (match[2] ? Number(match[2]) : min) as HeatLevel;
  return min <= max ? { min, max } : { min: max, max: min };
}

/** Human label for a raw heat query value, e.g. "ระดับ 4" or "ระดับ 3–5". */
export function heatLabelFor(value: string): string {
  const range = parseHeatParam(value);
  if (!range) return value;
  return range.min === range.max ? `ระดับ ${range.min}` : `ระดับ ${range.min}–${range.max}`;
}

export function matchesTaste(
  novel: { slug: string },
  filters: { relationship?: string; setting?: string; trope?: string; heat?: string },
): boolean {
  const taste = getNovelTaste(novel);
  if (isRelationshipValue(filters.relationship) && taste.relationship !== filters.relationship) return false;
  if (isSettingValue(filters.setting) && taste.setting !== filters.setting) return false;
  const tropes = parseTropeParam(filters.trope);
  if (tropes.length && !tropes.some((t) => taste.tropes.includes(t))) return false;
  const heatRange = parseHeatParam(filters.heat);
  if (heatRange && (taste.heat < heatRange.min || taste.heat > heatRange.max)) return false;
  return true;
}
