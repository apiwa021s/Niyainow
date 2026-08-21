/**
 * Placeholder data for the writer studio while the backend is being built.
 * Everything here is fake and lives in one file on purpose: when the real
 * services land, deleting this module should be the only cleanup needed.
 */

export type StudioWorkStatus = "draft" | "review" | "published" | "hiatus" | "completed";

/** Story-readiness checklist behind the "ความพร้อมของเรื่อง" card. */
export type StoryHealth = {
  hasCover: boolean;
  hasTagline: boolean;
  hasGenre: boolean;
  hasMaturitySettings: boolean;
  hasFreeIntroChapter: boolean;
};

export type StudioWork = {
  slug: string;
  title: string;
  genreLabel: string;
  cover: string | null;
  status: StudioWorkStatus;
  chapters: number;
  drafts: number;
  reads: number;
  followers: number;
  unlocks: number;
  earnings: number;
  updatedAt: string;
  /** Default heat level for the story — a chapter without its own override inherits this. */
  heatLevel: number;
  health: StoryHealth;
  defaultAccess: "free" | "paid";
  defaultPrice: number;
  /** How many opening chapters read free regardless of the default price. */
  freeIntroChapterCount: number;
  /** Percent change vs. the previous period, per metric — omitted where there's nothing to compare yet. */
  change?: { reads: number; unlocks: number; earnings: number; followers: number };
};

export type StudioChapter = {
  number: number;
  title: string;
  status: "draft" | "scheduled" | "published" | "unpublished";
  memberOnly?: boolean;
  earlyAccessNote?: string;
  publicReleaseNote?: string;
  price: number | null;
  unlocks: number;
  words: number;
  views: number;
  uniqueReaders: number;
  likes: number;
  comments: number;
  updatedAt: string;
  /** Present only when this chapter's rating differs from the story default. */
  heatOverride?: number;
  /** Present only when this chapter adds warnings beyond the story default. */
  warningIds?: string[];
};

export const studioProfile = {
  penName: "หลิวล่างเตอโหว",
  handle: "@liulang",
  role: "นักแปล",
  joinedAt: "มีนาคม 2569",
  verified: true,
};

export const studioSummary = {
  currentPeriod: "1–21 สิงหาคม 2569",
  earnings: 18_430.5,
  earningsChange: 12.4,
  unlocks: 5_266,
  unlocksChange: 8.1,
  reads: 142_880,
  readsChange: -3.2,
  followers: 3_204,
  followersChange: 2.6,
  nextPayoutDate: "15 กันยายน 2569",
  pendingBalance: 18_430.5,
  minimumPayout: 100,
};

const defaultHealth: StoryHealth = {
  hasCover: true,
  hasTagline: true,
  hasGenre: true,
  hasMaturitySettings: true,
  hasFreeIntroChapter: false,
};

export const studioWorks: readonly StudioWork[] = [
  {
    slug: "reborn-as-a-warlord",
    title: "เกิดใหม่เป็นลิโป้",
    genreLabel: "ย้อนยุค · สงคราม",
    cover: null,
    status: "published",
    chapters: 2_666,
    drafts: 3,
    reads: 270_800,
    followers: 2_140,
    unlocks: 4_120,
    earnings: 14_420,
    updatedAt: "2 ชั่วโมงที่แล้ว",
    heatLevel: 3,
    health: { ...defaultHealth, hasFreeIntroChapter: true },
    defaultAccess: "paid",
    defaultPrice: 5,
    freeIntroChapterCount: 5,
    change: { reads: 12.8, unlocks: 9.4, earnings: 12.4, followers: 3.1 },
  },
  {
    slug: "alchemy-empress",
    title: "ปรุงโอสถสวรรค์ สยบสัตว์เทพ",
    genreLabel: "แฟนตาซี · ย้อนยุค",
    cover: null,
    status: "published",
    chapters: 412,
    drafts: 0,
    reads: 62_400,
    followers: 820,
    unlocks: 980,
    earnings: 3_430,
    updatedAt: "เมื่อวาน",
    heatLevel: 2,
    health: { ...defaultHealth, hasFreeIntroChapter: true },
    defaultAccess: "paid",
    defaultPrice: 3,
    freeIntroChapterCount: 3,
    change: { reads: 4.2, unlocks: 6.5, earnings: 5.9, followers: 1.8 },
  },
  {
    slug: "system-of-a-thousand-lives",
    title: "ระบบนอบชีวิตตอนต่อไป",
    genreLabel: "ไซไฟ · แฟนตาซี",
    cover: null,
    status: "review",
    chapters: 24,
    drafts: 2,
    reads: 1_900,
    followers: 96,
    unlocks: 166,
    earnings: 580.5,
    updatedAt: "3 วันที่แล้ว",
    heatLevel: 1,
    health: { ...defaultHealth, hasFreeIntroChapter: true },
    defaultAccess: "paid",
    defaultPrice: 3,
    freeIntroChapterCount: 3,
  },
  {
    slug: "quiet-city-diary",
    title: "บันทึกเมืองเงียบ",
    genreLabel: "ร่วมสมัย",
    cover: null,
    status: "draft",
    chapters: 0,
    drafts: 5,
    reads: 0,
    followers: 0,
    unlocks: 0,
    earnings: 0,
    updatedAt: "1 สัปดาห์ที่แล้ว",
    heatLevel: 1,
    health: {
      hasCover: false,
      hasTagline: false,
      hasGenre: true,
      hasMaturitySettings: true,
      hasFreeIntroChapter: false,
    },
    defaultAccess: "free",
    defaultPrice: 3,
    freeIntroChapterCount: 3,
  },
];

export const studioChapters: readonly StudioChapter[] = [
  {
    number: 2666,
    title: "ศึกชิงเมืองด่านเหนือ",
    status: "published",
    earlyAccessNote: "สมาชิกอ่านได้แล้ว",
    publicReleaseNote: "Public อีก 3 วัน",
    price: 5,
    unlocks: 318,
    words: 3_420,
    views: 8_420,
    uniqueReaders: 6_830,
    likes: 1_082,
    comments: 186,
    updatedAt: "2 ชม. ที่แล้ว",
    // Battle chapter — reads more intense than the story's own Heat 3 default.
    heatOverride: 5,
    warningIds: ["blood_gore", "death"],
  },
  { number: 2665, title: "คำสั่งจากวังหลวง", status: "published", earlyAccessNote: "สมาชิกอ่านได้แล้ว", publicReleaseNote: "Public พรุ่งนี้ 20:00", price: 5, unlocks: 402, words: 3_180, views: 9_360, uniqueReaders: 7_560, likes: 964, comments: 142, updatedAt: "เมื่อวาน" },
  { number: 2664, title: "ม้าศึกกับสายฝน", status: "published", price: 5, unlocks: 455, words: 2_960, views: 10_240, uniqueReaders: 8_310, likes: 1_205, comments: 210, updatedAt: "2 วันที่แล้ว" },
  { number: 1, title: "คืนพิเศษ", status: "published", memberOnly: true, price: null, unlocks: 122, words: 1_980, views: 640, uniqueReaders: 420, likes: 188, comments: 61, updatedAt: "3 วันที่แล้ว" },
  { number: 2667, title: "เงาที่ประตูเมือง", status: "scheduled", price: 5, unlocks: 0, words: 3_050, views: 0, uniqueReaders: 0, likes: 0, comments: 0, updatedAt: "ตั้งเวลา 22 ส.ค. 20:00" },
  { number: 2668, title: "(ยังไม่ตั้งชื่อ)", status: "draft", price: null, unlocks: 0, words: 1_240, views: 0, uniqueReaders: 0, likes: 0, comments: 0, updatedAt: "แก้ล่าสุด 14 นาทีที่แล้ว" },
];

export const studioPayouts = [
  { period: "กรกฎาคม 2569", gross: 30_548, tax: 916.44, net: 29_631.56, status: "โอนแล้ว", paidAt: "15 ส.ค. 2569" },
  { period: "มิถุนายน 2569", gross: 24_110, tax: 723.3, net: 23_386.7, status: "โอนแล้ว", paidAt: "15 ก.ค. 2569" },
  { period: "พฤษภาคม 2569", gross: 19_870, tax: 596.1, net: 19_273.9, status: "โอนแล้ว", paidAt: "15 มิ.ย. 2569" },
  { period: "เมษายน 2569", gross: 402, tax: 0, net: 402, status: "ทบไปงวดถัดไป", paidAt: "—" },
] as const;

export const studioEarningsByWork = [
  { title: "เกิดใหม่เป็นลิโป้", unlocks: 4_120, gross: 14_420, share: 78 },
  { title: "ปรุงโอสถสวรรค์ สยบสัตว์เทพ", unlocks: 980, gross: 3_430, share: 19 },
  { title: "ระบบนอบชีวิตตอนต่อไป", unlocks: 166, gross: 580.5, share: 3 },
] as const;

export const studioTasks = [
  { label: "ยืนยันบัญชีธนาคารเพื่อรับเงินงวดถัดไป", href: "/studio/payouts", done: false },
  { label: "เพิ่มเรื่องย่อให้ “บันทึกเมืองเงียบ” ก่อนส่งตรวจ", href: "/studio/works/quiet-city-diary", done: false },
  { label: "อ่านและยอมรับข้อเสนอส่วนแบ่งรายได้ v1.0", href: "/creators", done: true },
] as const;

/**
 * Starter mode. A brand-new writer has nothing to show in the four money
 * tiles, and four zeroes read as a verdict on them. These four measure what
 * they actually control this week instead.
 */
export const studioStarterStats = {
  streakDays: 12,
  charactersThisMonth: 18_400,
  charactersChange: 22,
  queuedChapters: 3,
  queueCoversUntil: "24 ส.ค.",
  latestMilestone: "มีคนอ่านจบตอนที่ 3 แล้ว",
};

/** Drives the starter-mode switch: no meaningful money and almost no audience yet. */
export const studioIsNewCreator = studioSummary.earnings < 100 && studioSummary.followers < 10;

/** Hours a work has been sitting in review, for the waiting-state copy. */
export const studioReviewHours: Record<string, number> = {
  "system-of-a-thousand-lives": 31,
};

export const studioSearchIndex = {
  works: [
    { label: "เกิดใหม่เป็นลิโป้", meta: "2,666 ตอน", href: "/studio/works/reborn-as-a-warlord" },
    { label: "ปรุงโอสถสวรรค์ สยบสัตว์เทพ", meta: "412 ตอน", href: "/studio/works/alchemy-empress" },
    { label: "ระบบนอบชีวิตตอนต่อไป", meta: "รอตรวจ", href: "/studio/works/system-of-a-thousand-lives" },
    { label: "บันทึกเมืองเงียบ", meta: "ฉบับร่าง", href: "/studio/works/quiet-city-diary" },
    { label: "ดาบเดียวข้ามภพ", meta: "ฉบับร่าง", href: "/studio/works" },
  ],
  chapters: [
    { label: "ตอนที่ 2666 · ศึกชิงเมืองด่านเหนือ", meta: "เผยแพร่แล้ว", href: "/studio/works/reborn-as-a-warlord" },
    { label: "ตอนที่ 2667 · เงาที่ประตูเมือง", meta: "ตั้งเวลา 22 ส.ค.", href: "/studio/works/reborn-as-a-warlord" },
    { label: "ตอนที่ 2668 · (ยังไม่ตั้งชื่อ)", meta: "ร่าง", href: "/studio/works/reborn-as-a-warlord" },
    { label: "ตอนที่ 401 · เตาหลอมกลางพายุ", meta: "เผยแพร่แล้ว", href: "/studio/works/alchemy-empress" },
    { label: "ตอนที่ 24 · ระบบเปิดใช้งาน", meta: "รอตรวจ", href: "/studio/works/system-of-a-thousand-lives" },
  ],
  glossary: [
    { label: "จ้าวหลิงเอ๋อร์ · 赵灵儿", meta: "ตัวละคร", href: "/studio/glossary" },
    { label: "สำนักเมฆขาว · 白云宗", meta: "สถานที่", href: "/studio/glossary" },
    { label: "วิชาฝ่ามือมังกร · 龙掌功", meta: "วิชา/พลัง", href: "/studio/glossary" },
    { label: "ธาตุหยิน-หยาง · 阴阳", meta: "ศัพท์เฉพาะ", href: "/studio/glossary" },
  ],
} as const;

export const workStatusLabels: Record<StudioWorkStatus, { label: string; dot: string }> = {
  draft: { label: "ฉบับร่าง", dot: "bg-[var(--text-tertiary)]" },
  review: { label: "รอตรวจ", dot: "bg-amber-500" },
  published: { label: "เผยแพร่แล้ว", dot: "bg-emerald-500" },
  hiatus: { label: "พักการแปล", dot: "bg-amber-500" },
  completed: { label: "จบแล้ว", dot: "bg-[var(--brand-blue)]" },
};

/** Draft = neutral, Scheduled = purple, Published = success, Error = red — never all pink. */
export const chapterStatusLabels = {
  draft: { label: "ฉบับร่าง", dot: "bg-[var(--text-tertiary)]" },
  scheduled: { label: "ตั้งเวลา", dot: "bg-studio-purple" },
  published: { label: "เผยแพร่แล้ว", dot: "bg-emerald-500" },
  unpublished: { label: "นำออกจากการเผยแพร่", dot: "bg-destructive" },
} as const;

/**
 * A 90-day daily series per metric, generated once with a fixed seed derived
 * from the story's own totals (never Math.random — that would compute a
 * different value on the server render vs. the client and desync hydration).
 * The 7/30 day chart ranges are just the tail slice of this same array,
 * matching how a real analytics endpoint would actually shape the response.
 */
export type DailyMetric = { day: number; reads: number; unlocks: number; revenue: number };

function generateDailyPerformance(seedValue: number, days = 90): readonly DailyMetric[] {
  let seed = Math.max(1, Math.round(seedValue));
  const next = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
  const dailyBase = Math.max(20, seedValue / 90);
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const weekly = Math.sin((day / 7) * Math.PI * 2) * 0.15 + 1;
    const trend = 1 + index * 0.006;
    const noise = 0.85 + next() * 0.3;
    const reads = Math.round(dailyBase * weekly * trend * noise);
    const unlocks = Math.round(reads * (0.045 + next() * 0.01));
    const revenue = Math.round(unlocks * 3.5 * 100) / 100;
    return { day, reads, unlocks, revenue };
  });
}

/** Flagship demo story's series, kept as a named export for direct use. */
export const studioDailyPerformance: readonly DailyMetric[] = generateDailyPerformance(270_800);

/** Any other work gets its own deterministic series, scaled off its own totals. */
export function getStudioDailyPerformance(work: StudioWork): readonly DailyMetric[] {
  if (work.slug === "reborn-as-a-warlord") return studioDailyPerformance;
  return generateDailyPerformance(work.reads || 900);
}

export const baht = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const whole = new Intl.NumberFormat("th-TH");
