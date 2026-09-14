export const MISSION_CADENCES = ["daily", "weekly"] as const;
export type MissionCadence = (typeof MISSION_CADENCES)[number];

export const MISSION_METRICS = [
  "qualified_chapters",
  "main_class_chapters",
  "distinct_novels",
  "new_novels",
  "complete_core",
] as const;
export type MissionMetric = (typeof MISSION_METRICS)[number];

export const COSMETIC_SLOTS = [
  "profile_frame",
  "card_effect",
  "avatar_effect",
  "reader_title",
  "badge",
  "background",
] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export const COSMETIC_RARITIES = ["common", "rare", "epic", "legendary"] as const;
export type CosmeticRarity = (typeof COSMETIC_RARITIES)[number];

export type CosmeticVisualConfig = {
  accent?: string;
  accentSecondary?: string;
  pattern?: "none" | "grid" | "stars" | "petals" | "embers";
  animation?: "none" | "pulse" | "shimmer" | "float";
  title?: string;
  badgeText?: string;
};

export type ReaderMissionView = {
  id: string;
  cadence: MissionCadence;
  title: string;
  description: string;
  progress: number;
  target: number;
  readerExpReward: number;
  grantsCosmeticBox: boolean;
  completed: boolean;
  claimed: boolean;
};

export type ReaderCosmeticView = {
  id: string;
  name: string;
  description: string;
  slot: CosmeticSlot;
  rarity: CosmeticRarity;
  config: CosmeticVisualConfig;
  unlockedAt: string;
  equipped: boolean;
};

export type ReaderCosmeticLoadout = Partial<Record<CosmeticSlot, string | null>>;

export type ReaderMissionDashboard = {
  daily: {
    periodKey: string;
    endsAt: string;
    missions: ReaderMissionView[];
  };
  weekly: {
    periodKey: string;
    endsAt: string;
    missions: ReaderMissionView[];
  };
  cosmetics: {
    items: ReaderCosmeticView[];
    loadout: ReaderCosmeticLoadout;
  };
};

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1_000;

function bangkokParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function dateKey(timestamp: number) {
  const date = new Date(timestamp + BANGKOK_OFFSET_MS);
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
}

export function missionPeriod(cadence: MissionCadence, now = new Date()) {
  const { year, month, day } = bangkokParts(now);
  const localCalendarTimestamp = Date.UTC(year, month - 1, day);
  const weekday = new Date(localCalendarTimestamp).getUTCDay();
  const mondayOffset = cadence === "weekly" ? (weekday + 6) % 7 : 0;
  const startCalendarTimestamp = localCalendarTimestamp - mondayOffset * 86_400_000;
  const durationDays = cadence === "weekly" ? 7 : 1;
  const start = new Date(startCalendarTimestamp - BANGKOK_OFFSET_MS);
  const end = new Date(start.getTime() + durationDays * 86_400_000);
  return {
    cadence,
    periodKey: dateKey(start.getTime()),
    start,
    end,
  };
}

export function missionCompletionPercent(progress: number, target: number) {
  if (target <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(progress / target * 100)));
}
