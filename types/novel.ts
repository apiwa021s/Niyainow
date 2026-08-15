export type NovelStatus = "ongoing" | "completed" | "hiatus";

export type Genre = {
  slug: string;
  name: string;
  thaiName: string;
  description: string;
  count: number;
};

export type Novel = {
  id?: string;
  slug: string;
  title: string;
  thaiTitle: string;
  author: string;
  genres: string[];
  /** Labels keyed by genre slug; keeps presentation independent from seed data. */
  genreNames?: Record<string, string>;
  tags: string[];
  /** Labels keyed by tag slug; generated slugs are unreadable on their own. */
  tagNames?: Record<string, string>;
  status: NovelStatus;
  rating: number;
  ratingCount?: number;
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
  /** มาใหม่สัปดาห์นี้  badge "ใหม่" */
  isNew?: boolean;
  /** มีตอนที่ต้องใช้เหรียญ */
  hasPaidChapters?: boolean;
  /** อัปเดตล่าสุดเมื่อกี่ชั่วโมงที่แล้ว — ใช้กับตัวกรองช่วงเวลา (ส่วนที่ 6.4) */
  updatedHoursAgo?: number;
  publishedAt?: string;
  latestChapter?: Pick<Chapter, "number" | "title">;
};

export type Chapter = {
  id?: string;
  novelSlug: string;
  number: number;
  slug?: string;
  sortOrder?: number;
  title: string;
  body: string[];
  updatedAt: string;
  wordCount?: number;
  /** ตอนที่ยังไม่เปิดเนื้อหาเต็มแก่สาธารณะ */
  locked?: boolean;
  /** Reserved legacy price; production admin currently accepts free chapters only. */
  coinPrice?: number;
};

export type ChapterSummary = Omit<Chapter, "body">;

export type Review = {
  id: string;
  authorName: string;
  authorImage?: string | null;
  rating?: number | null;
  title?: string | null;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
