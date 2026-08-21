/**
 * Placeholder data for the studio's workflow surfaces — ห้องแปล, ตารางลง,
 * คลังคำ, ผู้อ่าน, ทีม, Academy. Same rule as mock-data.ts: fake, self-contained,
 * and safe to delete in one go once the real services exist.
 */

/* ── ห้องแปล ─────────────────────────────────────────────────────────── */

export type WorkroomStage = "draft" | "translated" | "checked" | "polished" | "ready";

export type WorkroomCard = {
  id: string;
  number: number;
  title: string;
  work: string;
  owner: string;
  characters: number;
  stuckDays: number;
};

export const workroomStages: readonly { key: WorkroomStage; label: string }[] = [
  { key: "draft", label: "ร่าง" },
  { key: "translated", label: "แปลแล้ว" },
  { key: "checked", label: "ตรวจแล้ว" },
  { key: "polished", label: "เกลาแล้ว" },
  { key: "ready", label: "พร้อมส่งคิว" },
];

export const workroomCards: Record<WorkroomStage, readonly WorkroomCard[]> = {
  draft: [
    { id: "c51", number: 51, title: "ประตูเมืองเปิด", work: "เกิดใหม่เป็นลิโป้", owner: "ฝน", characters: 1_240, stuckDays: 0 },
    { id: "c52", number: 52, title: "(ยังไม่ตั้งชื่อ)", work: "เกิดใหม่เป็นลิโป้", owner: "ฝน", characters: 320, stuckDays: 0 },
  ],
  translated: [
    { id: "c44", number: 44, title: "ทัพเหนือเคลื่อน", work: "เกิดใหม่เป็นลิโป้", owner: "ฝน", characters: 4_180, stuckDays: 1 },
    { id: "c45", number: 45, title: "คำสาบานใต้ต้นสน", work: "เกิดใหม่เป็นลิโป้", owner: "ฝน", characters: 4_020, stuckDays: 1 },
    { id: "c46", number: 46, title: "ดาบที่ไม่ได้ชัก", work: "เกิดใหม่เป็นลิโป้", owner: "ฝน", characters: 3_880, stuckDays: 2 },
  ],
  checked: [
    { id: "c43", number: 43, title: "สายฝนเหนือด่าน", work: "เกิดใหม่เป็นลิโป้", owner: "ต้น", characters: 4_320, stuckDays: 6 },
  ],
  polished: [
    { id: "c42", number: 42, title: "ม้าขาวกลางสมรภูมิ", work: "เกิดใหม่เป็นลิโป้", owner: "แนน", characters: 4_450, stuckDays: 1 },
  ],
  ready: [
    { id: "c41", number: 41, title: "เสียงกลองแรก", work: "เกิดใหม่เป็นลิโป้", owner: "แนน", characters: 4_832, stuckDays: 0 },
  ],
};

export const workroomBottleneck = {
  chapter: 43,
  stage: "ตรวจทาน",
  days: 6,
  blockedFrom: 44,
  blockedTo: 50,
  releasableNow: 0,
  translatedAhead: 8,
};

export const workroomPreflight = {
  characters: 4_832,
  glossaryIssues: [
    { id: "p1", found: "จ้าวหลิงเอ่อร์", expected: "จ้าวหลิงเอ๋อร์" },
    { id: "p2", found: "ฝ่ามือมังกล", expected: "ฝ่ามือมังกร" },
    { id: "p3", found: "สำนักเมฆขาวใหญ่", expected: "สำนักเมฆขาว" },
  ],
};

/* ── ตารางลง ─────────────────────────────────────────────────────────── */

export const scheduleQueue = [
  { id: "q1", number: 41, title: "เสียงกลองแรก", releaseAt: "22 ส.ค. 20:00" },
  { id: "q2", number: 42, title: "ม้าขาวกลางสมรภูมิ", releaseAt: "23 ส.ค. 20:00" },
  { id: "q3", number: 43, title: "สายฝนเหนือด่าน", releaseAt: "24 ส.ค. 20:00" },
  { id: "q4", number: 44, title: "ทัพเหนือเคลื่อน", releaseAt: "25 ส.ค. 20:00" },
  { id: "q5", number: 45, title: "คำสาบานใต้ต้นสน", releaseAt: "26 ส.ค. 20:00" },
  { id: "q6", number: 46, title: "ดาบที่ไม่ได้ชัก", releaseAt: "27 ส.ค. 20:00" },
  { id: "q7", number: 47, title: "คืนก่อนเข้าตี", releaseAt: "28 ส.ค. 20:00" },
  { id: "q8", number: 48, title: "ธงแดงเหนือกำแพง", releaseAt: "29 ส.ค. 20:00" },
  { id: "q9", number: 49, title: "ผู้มาเยือนจากใต้", releaseAt: "30 ส.ค. 20:00" },
  { id: "q10", number: 50, title: "สัญญาที่ไม่ได้เขียน", releaseAt: "31 ส.ค. 20:00" },
  { id: "q11", number: 51, title: "ประตูเมืองเปิด", releaseAt: "1 ก.ย. 20:00" },
  { id: "q12", number: 52, title: "เช้าวันที่หมอกลง", releaseAt: "2 ก.ย. 20:00" },
];

export const scheduleSummary = {
  coversUntil: "3 กันยายน 2569",
  monthLabel: "สิงหาคม 2569",
  daysInMonth: 31,
  /** Weekday offset of the 1st, Monday-first. */
  firstWeekday: 5,
  releaseDays: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
};

/* ── คลังคำ ──────────────────────────────────────────────────────────── */

export type GlossaryKind = "character" | "place" | "skill" | "term" | "other";

export const glossaryKindLabels: Record<GlossaryKind, { label: string; className: string }> = {
  character: { label: "ตัวละคร", className: "bg-accent-subtle text-(--brand-emphasis)" },
  place: { label: "สถานที่", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  skill: { label: "วิชา/พลัง", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  term: { label: "ศัพท์เฉพาะ", className: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  other: { label: "อื่น ๆ", className: "bg-muted text-(--text-secondary)" },
};

export type GlossaryEntry = {
  id: string;
  source: string;
  thai: string;
  kind: GlossaryKind;
  work: string;
  hits: number;
  note: string;
  tooltip: boolean;
};

export const glossaryEntries: readonly GlossaryEntry[] = [
  { id: "g1", source: "赵灵儿", thai: "จ้าวหลิงเอ๋อร์", kind: "character", work: "เกิดใหม่เป็นลิโป้", hits: 412, note: "นางเอก ห้ามใช้ “เอ่อร์”", tooltip: true },
  { id: "g2", source: "白云宗", thai: "สำนักเมฆขาว", kind: "place", work: "เกิดใหม่เป็นลิโป้", hits: 188, note: "", tooltip: true },
  { id: "g3", source: "龙掌功", thai: "วิชาฝ่ามือมังกร", kind: "skill", work: "เกิดใหม่เป็นลิโป้", hits: 96, note: "ไม่ใช่ “ฝ่ามือมังกล”", tooltip: false },
  { id: "g4", source: "阴阳", thai: "หยิน-หยาง", kind: "term", work: "ทุกเรื่อง", hits: 74, note: "ทับศัพท์ ไม่แปล", tooltip: true },
  { id: "g5", source: "丹田", thai: "ตันเถียน", kind: "term", work: "ปรุงโอสถสวรรค์ สยบสัตว์เทพ", hits: 210, note: "", tooltip: false },
  { id: "g6", source: "吕布", thai: "ลิโป้", kind: "character", work: "เกิดใหม่เป็นลิโป้", hits: 1_020, note: "ใช้ชื่อไทยที่คนคุ้นเคย", tooltip: true },
];

export const glossaryWorks = ["ทุกเรื่อง", "เกิดใหม่เป็นลิโป้", "ปรุงโอสถสวรรค์ สยบสัตว์เทพ", "ระบบนอบชีวิตตอนต่อไป"];

/* ── ผู้อ่าน ──────────────────────────────────────────────────────────── */

export const readerComments = [
  { id: "r1", reader: "มินท์", work: "เกิดใหม่เป็นลิโป้", chapter: "ตอนที่ 2666", at: "2 ชม. ที่แล้ว", body: "ฉากรบตอนนี้เขียนเห็นภาพมาก อ่านรวดเดียวจบเลย", replied: false },
  { id: "r2", reader: "พีท", work: "ปรุงโอสถสวรรค์ สยบสัตว์เทพ", chapter: "ตอนที่ 401", at: "5 ชม. ที่แล้ว", body: "ชื่อยาตรงนี้แปลไม่เหมือนตอนก่อนหรือเปล่าครับ", replied: false },
  { id: "r3", reader: "หนึ่ง", work: "เกิดใหม่เป็นลิโป้", chapter: "ตอนที่ 2664", at: "เมื่อวาน", body: "รอตอนต่อไปอยู่นะครับ", replied: true },
];

export const readerCompletion = [
  { work: "เกิดใหม่เป็นลิโป้", rate: 82 },
  { work: "ปรุงโอสถสวรรค์ สยบสัตว์เทพ", rate: 71 },
  { work: "ระบบนอบชีวิตตอนต่อไป", rate: 54 },
];

export const readerDropoff = [
  { chapter: 1, retained: 100 },
  { chapter: 2, retained: 94 },
  { chapter: 3, retained: 88 },
  { chapter: 4, retained: 84 },
  { chapter: 5, retained: 61 },
  { chapter: 6, retained: 58 },
  { chapter: 7, retained: 56 },
  { chapter: 8, retained: 54 },
  { chapter: 9, retained: 52 },
  { chapter: 10, retained: 51 },
];

export const readerFollowDrivers = [
  { chapter: "ตอนที่ 5 · เปิดตำนานเมืองเก่า", follows: 312 },
  { chapter: "ตอนที่ 1 · เกิดใหม่กลางสมรภูมิ", follows: 268 },
  { chapter: "ตอนที่ 12 · คำสาบานที่ผิดคำ", follows: 141 },
  { chapter: "ตอนที่ 30 · ศึกชิงด่านเหนือ", follows: 98 },
  { chapter: "ตอนที่ 44 · ทัพเหนือเคลื่อน", follows: 63 },
];

/* ── ทีม ─────────────────────────────────────────────────────────────── */

export const teamMembers = [
  { id: "t1", name: "หลิวล่างเตอโหว (คุณ)", role: "แปล", works: "เกิดใหม่เป็นลิโป้", share: 60 },
  { id: "t2", name: "ต้น", role: "ตรวจ", works: "เกิดใหม่เป็นลิโป้", share: 20 },
  { id: "t3", name: "แนน", role: "เกลา", works: "เกิดใหม่เป็นลิโป้", share: 15 },
];

/* ── Academy ─────────────────────────────────────────────────────────── */

export type LessonStatus = "locked" | "available" | "done";

export type Lesson = {
  id: number;
  title: string;
  minutes: number;
  status: LessonStatus;
  reward: string;
};

export const academyTracks: Record<"translator" | "author", readonly Lesson[]> = {
  translator: [
    { id: 1, title: "ตั้งคลังคำก่อนแปลตอนแรก", minutes: 2, status: "done", reward: "ปลดล็อก: ตรวจความสม่ำเสมออัตโนมัติ" },
    { id: 2, title: "ชื่อเฉพาะ: ทับศัพท์หรือแปลดี", minutes: 3, status: "done", reward: "" },
    { id: 3, title: "จังหวะประโยคไทยที่อ่านลื่น", minutes: 4, status: "available", reward: "" },
    { id: 4, title: "จัดคิวให้ลงสม่ำเสมอโดยไม่หมดไฟ", minutes: 3, status: "locked", reward: "ปลดล็อก: เครื่องมือวางแผนคิว" },
    { id: 5, title: "อ่านกราฟจุดที่คนเลิกอ่าน", minutes: 5, status: "locked", reward: "ปลดล็อก: เครื่องมือวิเคราะห์ hook" },
  ],
  author: [
    { id: 1, title: "เปิดเรื่องให้คนอ่านไม่วาง", minutes: 3, status: "done", reward: "" },
    { id: 2, title: "วางปมให้คนรอตอนต่อไป", minutes: 4, status: "available", reward: "ปลดล็อก: เครื่องมือวิเคราะห์ hook" },
    { id: 3, title: "เขียนเรื่องย่อที่คนกดเข้ามาอ่าน", minutes: 2, status: "locked", reward: "" },
    { id: 4, title: "ตั้งราคาตอนอย่างไรให้เหมาะ", minutes: 3, status: "locked", reward: "" },
  ],
};
