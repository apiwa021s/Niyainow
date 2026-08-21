/**
 * Placeholder data for Writer Monetization + Creator Earnings + Revenue
 * Share. Same rule as mock-data.ts: fake, self-contained, and safe to delete
 * in one go once the real revenue-events backend lands.
 *
 * Every derived number below (chapter → story → account rollups) runs
 * through lib/studio/revenue.ts, the same pure split function a real backend
 * would use — so a story's total always equals the sum of its own chapters,
 * and the account total always equals the sum of its own stories. That's not
 * decoration: it's the one invariant the real ledger has to hold too.
 */

import {
  CREATOR_REVENUE_CONTRACT_TYPES,
  CREATOR_TRANSACTION_TYPES,
  findMaster,
} from "@/lib/studio/master-data";
import { calculateRevenueShare, coinsToEligibleRevenueMinor, minorToBaht } from "@/lib/studio/revenue";

export type RevenueContractType = "standard" | "founding_author" | "exclusive" | "custom";

export type CreatorRevenueContract = {
  type: RevenueContractType;
  creatorSharePercent: number;
  platformSharePercent: number;
  effectiveFromLabel: string;
  /** null means this is the contract in force today. */
  effectiveToLabel: string | null;
};

export const currentRevenueContract: CreatorRevenueContract = {
  type: "founding_author",
  creatorSharePercent: 85,
  platformSharePercent: 15,
  effectiveFromLabel: "1 สิงหาคม 2569",
  effectiveToLabel: null,
};

/** Newest first — Contract change history (spec §21). Past periods keep the rate that was active then. */
export const revenueContractHistory: readonly CreatorRevenueContract[] = [
  currentRevenueContract,
  {
    type: "standard",
    creatorSharePercent: 80,
    platformSharePercent: 20,
    effectiveFromLabel: "1 มกราคม 2569",
    effectiveToLabel: "31 กรกฎาคม 2569",
  },
];

export function contractTypeLabel(type: RevenueContractType) {
  return findMaster(CREATOR_REVENUE_CONTRACT_TYPES, type)?.nameTh ?? type;
}

const SHARE = currentRevenueContract.creatorSharePercent;

/* ── Chapter-level facts — the only numbers here typed by hand ──────────── */

type ChapterFact = {
  storySlug: string;
  number: number;
  title: string;
  priceCoins: number;
  unlocks: number;
  updatedAtLabel: string;
  /** A demo adjustment, so the breakdown drawer has something real to explain (spec §19). */
  adjustmentMinor?: number;
  adjustmentReason?: string;
};

const chapterFacts: readonly ChapterFact[] = [
  // เกิดใหม่เป็นลิโป้ — 5 Coins ต่อตอน
  {
    storySlug: "reborn-as-a-warlord",
    number: 2666,
    title: "ศึกชิงเมืองด่านเหนือ",
    priceCoins: 5,
    unlocks: 318,
    updatedAtLabel: "2 ชม. ที่แล้ว",
    adjustmentMinor: -3_000,
    adjustmentReason: "คืนเงินให้ผู้อ่าน 1 รายการ — ตอนโหลดซ้ำซ้อนจากปัญหาเครือข่าย",
  },
  { storySlug: "reborn-as-a-warlord", number: 2665, title: "คำสั่งจากวังหลวง", priceCoins: 5, unlocks: 402, updatedAtLabel: "เมื่อวาน" },
  { storySlug: "reborn-as-a-warlord", number: 2664, title: "ม้าศึกกับสายฝน", priceCoins: 5, unlocks: 455, updatedAtLabel: "2 วันที่แล้ว" },
  { storySlug: "reborn-as-a-warlord", number: 2663, title: "ทัพเหนือเคลื่อนพล", priceCoins: 5, unlocks: 380, updatedAtLabel: "3 วันที่แล้ว" },
  { storySlug: "reborn-as-a-warlord", number: 2662, title: "คืนก่อนเข้าตี", priceCoins: 5, unlocks: 340, updatedAtLabel: "4 วันที่แล้ว" },
  { storySlug: "reborn-as-a-warlord", number: 2661, title: "ธงแดงเหนือกำแพง", priceCoins: 5, unlocks: 289, updatedAtLabel: "5 วันที่แล้ว" },
  // ปรุงโอสถสวรรค์ สยบสัตว์เทพ — 3 Coins ต่อตอน
  { storySlug: "alchemy-empress", number: 412, title: "เตาหลอมกลางพายุ", priceCoins: 3, unlocks: 210, updatedAtLabel: "เมื่อวาน" },
  { storySlug: "alchemy-empress", number: 411, title: "ยาพิษไร้เสียง", priceCoins: 3, unlocks: 175, updatedAtLabel: "3 วันที่แล้ว" },
  { storySlug: "alchemy-empress", number: 410, title: "สูตรต้องห้าม", priceCoins: 3, unlocks: 150, updatedAtLabel: "5 วันที่แล้ว" },
  // ระบบนอบชีวิตตอนต่อไป — 3 Coins ต่อตอน
  { storySlug: "system-of-a-thousand-lives", number: 24, title: "ระบบเปิดใช้งาน", priceCoins: 3, unlocks: 96, updatedAtLabel: "รอตรวจ" },
  { storySlug: "system-of-a-thousand-lives", number: 23, title: "จุดเริ่มต้นใหม่", priceCoins: 3, unlocks: 70, updatedAtLabel: "1 สัปดาห์ที่แล้ว" },
];

export type ChapterEarnings = ChapterFact & {
  eligibleRevenue: number;
  creatorRevenueBeforeAdjustment: number;
  /** After the demo adjustment above, if any — this is what the writer actually sees as "รายได้ของคุณ". */
  creatorRevenue: number;
  platformRevenue: number;
  sharePercent: number;
  perUnlock: number;
};

export const chapterEarnings: readonly ChapterEarnings[] = chapterFacts.map((fact) => {
  const eligibleMinor = coinsToEligibleRevenueMinor(fact.priceCoins, fact.unlocks);
  const breakdown = calculateRevenueShare(eligibleMinor, SHARE);
  const adjustment = fact.adjustmentMinor ?? 0;
  const perUnlockBreakdown = calculateRevenueShare(coinsToEligibleRevenueMinor(fact.priceCoins), SHARE);
  return {
    ...fact,
    eligibleRevenue: minorToBaht(breakdown.eligibleRevenueMinor),
    creatorRevenueBeforeAdjustment: minorToBaht(breakdown.creatorRevenueMinor),
    creatorRevenue: minorToBaht(breakdown.creatorRevenueMinor + adjustment),
    platformRevenue: minorToBaht(breakdown.platformRevenueMinor),
    sharePercent: SHARE,
    perUnlock: minorToBaht(perUnlockBreakdown.creatorRevenueMinor),
  };
});

export function chapterEarningsForStory(storySlug: string): readonly ChapterEarnings[] {
  return chapterEarnings.filter((row) => row.storySlug === storySlug);
}

/* ── Story-level rollups — summed from the chapter facts above ──────────── */

export type StoryEarnings = {
  slug: string;
  title: string;
  earnings: number;
  unlocks: number;
  /** Percent change vs. the previous period. */
  change: number;
};

const storyMeta: Record<string, { title: string; change: number }> = {
  "reborn-as-a-warlord": { title: "เกิดใหม่เป็นลิโป้", change: 18.4 },
  "alchemy-empress": { title: "ปรุงโอสถสวรรค์ สยบสัตว์เทพ", change: -4.2 },
  "system-of-a-thousand-lives": { title: "ระบบนอบชีวิตตอนต่อไป", change: 32.6 },
};

export const storyEarnings: readonly StoryEarnings[] = Object.entries(storyMeta).map(([slug, meta]) => {
  const rows = chapterEarningsForStory(slug);
  return {
    slug,
    title: meta.title,
    earnings: rows.reduce((sum, row) => sum + row.creatorRevenue, 0),
    unlocks: rows.reduce((sum, row) => sum + row.unlocks, 0),
    change: meta.change,
  };
});

export function storyEarningsBySlug(slug: string) {
  return storyEarnings.find((row) => row.slug === slug);
}

export type StoryEarningsSort = "earnings" | "unlocks" | "recent";

export function sortStoryEarnings(rows: readonly StoryEarnings[], sort: StoryEarningsSort) {
  const copy = [...rows];
  if (sort === "earnings") return copy.sort((a, b) => b.earnings - a.earnings);
  if (sort === "unlocks") return copy.sort((a, b) => b.unlocks - a.unlocks);
  // "recent" — order stories were most recently updated, using the flagship's chapter order as the proxy.
  const order = ["reborn-as-a-warlord", "alchemy-empress", "system-of-a-thousand-lives"];
  return copy.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
}

/* ── Account-level rollup — the numbers behind the Earnings hero ────────── */

const monthlyEarnings = storyEarnings.reduce((sum, row) => sum + row.earnings, 0);
const monthlyUnlocks = storyEarnings.reduce((sum, row) => sum + row.unlocks, 0);

export const creatorEarningsAccount = {
  currentPeriodLabel: "1–21 สิงหาคม 2569",
  monthlyEarnings,
  monthlyEarningsChange: 12.4,
  monthlyUnlocks,
  monthlyUnlocksChange: 8.1,
  /** Readers rarely unlock only once — a rough repeat-purchase ratio for the "ผู้อ่านที่ซื้อ" tile. */
  uniqueBuyers: Math.round(monthlyUnlocks * 0.68),
  pendingAmount: 1_280,
  availableAmount: 8_420,
  lifetimeEarnings: 42_630,
};

export const creatorEarningsHeroTotal = creatorEarningsAccount.pendingAmount + creatorEarningsAccount.availableAmount;

export const hasAnyPaidChapters = chapterEarnings.length > 0;
export const hasAnyUnlocks = monthlyUnlocks > 0;

/* ── Daily series for the earnings chart — same shape mock-data.ts already uses ── */

export type EarningsDailyPoint = { day: number; revenue: number };

function generateEarningsDaily(seedValue: number, days = 90): readonly EarningsDailyPoint[] {
  let seed = Math.max(1, Math.round(seedValue));
  const next = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
  const dailyBase = Math.max(50, (seedValue / days) * 3.4);
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const weekly = Math.sin((day / 7) * Math.PI * 2) * 0.15 + 1;
    const trend = 1 + index * 0.004;
    const noise = 0.82 + next() * 0.36;
    return { day, revenue: Math.round(dailyBase * weekly * trend * noise * 100) / 100 };
  });
}

/**
 * Deterministic like mock-data.ts's generator — never Math.random, or
 * SSR/client renders would desync. Rescaled so the last 30 days sum to
 * exactly `monthlyEarnings`: the chart's own default-view total has to match
 * the "รายได้เดือนนี้" tile sitting right above it, or the one thing this
 * whole feature promises — that every number here checks out — breaks on
 * the very first page a writer looks at.
 */
function buildEarningsDaily(): readonly EarningsDailyPoint[] {
  const raw = generateEarningsDaily(monthlyEarnings);
  const last30Sum = raw.slice(-30).reduce((sum, point) => sum + point.revenue, 0);
  const scale = last30Sum > 0 ? monthlyEarnings / last30Sum : 1;
  return raw.map((point) => ({ ...point, revenue: Math.round(point.revenue * scale * 100) / 100 }));
}

export const creatorEarningsDaily: readonly EarningsDailyPoint[] = buildEarningsDaily();

/* ── Transactions — the ledger view a writer actually sees (spec §22–24) ── */

export type CreatorTransactionType = (typeof CREATOR_TRANSACTION_TYPES)[number]["id"];
export type CreatorTransactionStatus = "pending" | "available" | "reversed";

export type CreatorTransaction = {
  id: string;
  atLabel: string;
  type: CreatorTransactionType;
  storySlug?: string;
  storyTitle?: string;
  chapterLabel?: string;
  amount: number;
  status: CreatorTransactionStatus;
  description?: string;
};

function unlockTxFromChapter(chapter: ChapterEarnings, atLabel: string, index: number): CreatorTransaction {
  return {
    id: `tx-unlock-${chapter.storySlug}-${chapter.number}-${index}`,
    atLabel,
    type: "chapter_unlock",
    storySlug: chapter.storySlug,
    storyTitle: storyMeta[chapter.storySlug]?.title,
    chapterLabel: `EP.${chapter.number} — ${chapter.title}`,
    amount: chapter.perUnlock,
    status: index < 3 ? "pending" : "available",
  };
}

const sampleUnlockTx = chapterEarnings
  .flatMap((chapter) => [chapter, chapter, chapter])
  .map((chapter, index) =>
    unlockTxFromChapter(
      chapter,
      ["21 ส.ค. 2569 • 22:41", "21 ส.ค. 2569 • 20:03", "21 ส.ค. 2569 • 18:27", "20 ส.ค. 2569 • 11:52", "19 ส.ค. 2569 • 09:14"][
        index % 5
      ],
      index,
    ),
  );

const flagshipChapter = chapterEarnings.find((row) => row.storySlug === "reborn-as-a-warlord" && row.number === 2666);

const otherTx: readonly CreatorTransaction[] = [
  {
    id: "tx-refund-2666",
    atLabel: "21 ส.ค. 2569 • 23:20",
    type: "refund_reversal",
    storySlug: "reborn-as-a-warlord",
    storyTitle: storyMeta["reborn-as-a-warlord"].title,
    chapterLabel: flagshipChapter ? `EP.${flagshipChapter.number} — ${flagshipChapter.title}` : undefined,
    amount: -(flagshipChapter?.perUnlock ?? 4.25),
    status: "reversed",
    description: "คืนเงินให้ผู้อ่าน — ตอนโหลดซ้ำซ้อนจากปัญหาเครือข่าย",
  },
  {
    id: "tx-bonus-founding",
    atLabel: "1 ส.ค. 2569 • 09:00",
    type: "creator_bonus",
    amount: 1_000,
    status: "available",
    description: "โบนัสนักเขียนเปิดตัว NovelNow",
  },
  {
    id: "tx-adjustment-1",
    atLabel: "15 ส.ค. 2569 • 14:12",
    type: "adjustment",
    storySlug: "alchemy-empress",
    storyTitle: storyMeta["alchemy-empress"].title,
    amount: -30,
    status: "available",
    description: "ปรับปรุงยอดหลังตรวจสอบธุรกรรมซ้ำซ้อน",
  },
];

export const creatorTransactions: readonly CreatorTransaction[] = [...sampleUnlockTx.slice(0, 14), ...otherTx].sort((a, b) =>
  a.atLabel < b.atLabel ? 1 : -1,
);

export const creatorTransactionTypeOptions = CREATOR_TRANSACTION_TYPES;
