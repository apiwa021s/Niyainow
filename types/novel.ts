export type NovelStatus = "ongoing" | "completed" | "hiatus";

export type Genre = {
  slug: string;
  name: string;
  thaiName: string;
  description: string;
  count: number;
};

export type Novel = {
  slug: string;
  title: string;
  thaiTitle: string;
  author: string;
  genres: string[];
  tags: string[];
  status: NovelStatus;
  rating: number;
  views: number;
  chapters: number;
  synopsis: string;
  cover: string;
  backdrop: string;
  updatedAt: string;
  featured?: boolean;
  completed?: boolean;
  /** ผู้แปล/ทีมแปล (ส่วนที่ 6.6) */
  translator?: string;
  /** จำนวนคนบุ๊กมาร์ก — ใช้ในแถวสถิติของการ์ด */
  bookmarkCount?: number;
  /** ชื่อตอนล่าสุด ใช้โชว์ในแถว "อัปเดตล่าสุด" */
  latestChapterTitle?: string;
  /** มาใหม่สัปดาห์นี้ → badge "ใหม่" */
  isNew?: boolean;
  /** มีตอนที่ต้องใช้เหรียญ */
  hasPaidChapters?: boolean;
  /** อัปเดตล่าสุดเมื่อกี่ชั่วโมงที่แล้ว — ใช้กับตัวกรองช่วงเวลา (ส่วนที่ 6.4) */
  updatedHoursAgo?: number;
};

export type Chapter = {
  novelSlug: string;
  number: number;
  title: string;
  body: string[];
  updatedAt: string;
  /** ตอนที่ต้องจ่ายเหรียญเพื่ออ่าน (ส่วนที่ 6.7 — Paywall) */
  locked?: boolean;
  /** ราคาเป็นเหรียญ แสดงเสมอ ห้ามซ่อนจนกว่าจะกด (ส่วนที่ 11) */
  coinPrice?: number;
};

/** แพ็กเกจเติมเหรียญ (ส่วนที่ 6.11) */
export type CoinPackage = {
  id: string;
  coins: number;
  bonus: number;
  priceTHB: number;
  bestValue?: boolean;
};

export type UpdateItem = {
  novelSlug: string;
  chapter: number;
  chapterTitle: string;
  time: string;
};

export type ReadingRecord = {
  novelSlug: string;
  chapter: number;
  progress: number;
  updatedAt: string;
};

export type SearchResultGroup = {
  novels: Novel[];
  genres: Genre[];
  tags: string[];
};
