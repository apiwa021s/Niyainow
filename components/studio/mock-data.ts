/**
 * Placeholder data for the writer studio while the backend is being built.
 * Everything here is fake and lives in one file on purpose: when the real
 * services land, deleting this module should be the only cleanup needed.
 */

export type StudioWorkStatus = "draft" | "review" | "published" | "hiatus" | "completed";

export type StudioWork = {
  slug: string;
  title: string;
  cover: string | null;
  status: StudioWorkStatus;
  chapters: number;
  drafts: number;
  reads: number;
  followers: number;
  unlocks: number;
  earnings: number;
  updatedAt: string;
};

export type StudioChapter = {
  number: number;
  title: string;
  status: "draft" | "scheduled" | "published";
  price: number | null;
  unlocks: number;
  words: number;
  updatedAt: string;
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
  minimumPayout: 500,
};

export const studioWorks: readonly StudioWork[] = [
  {
    slug: "reborn-as-a-warlord",
    title: "เกิดใหม่เป็นลิโป้",
    cover: null,
    status: "published",
    chapters: 2_666,
    drafts: 3,
    reads: 270_800,
    followers: 2_140,
    unlocks: 4_120,
    earnings: 14_420,
    updatedAt: "2 ชั่วโมงที่แล้ว",
  },
  {
    slug: "alchemy-empress",
    title: "ปรุงโอสถสวรรค์ สยบสัตว์เทพ",
    cover: null,
    status: "published",
    chapters: 412,
    drafts: 0,
    reads: 62_400,
    followers: 820,
    unlocks: 980,
    earnings: 3_430,
    updatedAt: "เมื่อวาน",
  },
  {
    slug: "system-of-a-thousand-lives",
    title: "ระบบนอบชีวิตตอนต่อไป",
    cover: null,
    status: "review",
    chapters: 24,
    drafts: 2,
    reads: 1_900,
    followers: 96,
    unlocks: 166,
    earnings: 580.5,
    updatedAt: "3 วันที่แล้ว",
  },
  {
    slug: "quiet-city-diary",
    title: "บันทึกเมืองเงียบ",
    cover: null,
    status: "draft",
    chapters: 0,
    drafts: 5,
    reads: 0,
    followers: 0,
    unlocks: 0,
    earnings: 0,
    updatedAt: "1 สัปดาห์ที่แล้ว",
  },
];

export const studioChapters: readonly StudioChapter[] = [
  { number: 2666, title: "ศึกชิงเมืองด่านเหนือ", status: "published", price: 5, unlocks: 318, words: 3_420, updatedAt: "2 ชม. ที่แล้ว" },
  { number: 2665, title: "คำสั่งจากวังหลวง", status: "published", price: 5, unlocks: 402, words: 3_180, updatedAt: "เมื่อวาน" },
  { number: 2664, title: "ม้าศึกกับสายฝน", status: "published", price: 5, unlocks: 455, words: 2_960, updatedAt: "2 วันที่แล้ว" },
  { number: 2667, title: "เงาที่ประตูเมือง", status: "scheduled", price: 5, unlocks: 0, words: 3_050, updatedAt: "ตั้งเวลา 22 ส.ค. 20:00" },
  { number: 2668, title: "(ยังไม่ตั้งชื่อ)", status: "draft", price: null, unlocks: 0, words: 1_240, updatedAt: "แก้ล่าสุด 1 ชม. ที่แล้ว" },
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

export const workStatusLabels: Record<StudioWorkStatus, { label: string; dot: string }> = {
  draft: { label: "ฉบับร่าง", dot: "bg-[var(--text-tertiary)]" },
  review: { label: "รอตรวจ", dot: "bg-amber-500" },
  published: { label: "เผยแพร่แล้ว", dot: "bg-emerald-500" },
  hiatus: { label: "พักการแปล", dot: "bg-amber-500" },
  completed: { label: "จบแล้ว", dot: "bg-[var(--brand-blue)]" },
};

export const chapterStatusLabels = {
  draft: { label: "ร่าง", dot: "bg-[var(--text-tertiary)]" },
  scheduled: { label: "ตั้งเวลา", dot: "bg-amber-500" },
  published: { label: "เผยแพร่", dot: "bg-emerald-500" },
} as const;

export const baht = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const whole = new Intl.NumberFormat("th-TH");
