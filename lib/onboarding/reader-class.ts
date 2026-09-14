export const READER_CLASS_STORAGE_KEY = "novelnow-reader-class:v2";
export const PREVIOUS_READER_CLASS_STORAGE_KEY = "novelnow-reader-class:v1";
export const LEGACY_READER_CLASS_STORAGE_KEY = "novelnow-reader-class";

export const READER_CLASSES = [
  {
    id: "martial",
    icon: "/Images/class_icon/01.png",
    name: "เซียนยุทธ์",
    title: "ผู้ท้าทายสวรรค์",
    description: "คุณชอบการเติบโตจากศูนย์ การฝึกตน และตัวเอกที่ไม่ยอมก้มหัวให้โชคชะตา",
    tastes: ["จีนกำลังภายใน", "เซียน", "ระบบ", "เกิดใหม่"],
    recommendationGenres: ["martial-arts", "system", "fantasy"],
    image: "/Images/classs/01.png",
    accent: "#f3b34f",
  },
  {
    id: "bl",
    icon: "/Images/class_icon/02.png",
    name: "สาวกวาย",
    title: "นักเดินเรือแห่งด้อม",
    description: "ทุกสายตาและทุกความสัมพันธ์มีความหมาย คุณพร้อมขึ้นเรือและเชียร์คู่โปรดจนสุดทาง",
    tastes: ["BL", "Boy Love", "โรแมนซ์ชาย×ชาย"],
    recommendationGenres: ["romance", "drama"],
    image: "/Images/classs/02.png",
    accent: "#ff6caa",
  },
  {
    id: "yuri",
    icon: "/Images/class_icon/03.png",
    name: "ยูริเลิฟเวอร์",
    title: "ผู้พิทักษ์สวนดอกไม้",
    description: "คุณหลงใหลความสัมพันธ์ที่ค่อย ๆ ผลิบาน อ่อนโยนแต่ชัดเจน และพร้อมปกป้องคู่โปรดเสมอ",
    tastes: ["GL", "Yuri", "โรแมนซ์หญิง×หญิง"],
    recommendationGenres: ["romance", "slice-of-life"],
    image: "/Images/classs/03.png",
    accent: "#ff89bd",
  },
  {
    id: "romance",
    icon: "/Images/class_icon/04.png",
    name: "นักล่าหัวใจ",
    title: "คนคลั่งรัก",
    description: "คุณอ่านทุกจังหวะหัวใจออก และไม่ยอมวางเรื่องนั้นลงจนกว่าความสัมพันธ์จะได้คำตอบ",
    tastes: ["Romance", "CEO", "แต่งงาน", "แอบรัก"],
    recommendationGenres: ["romance", "contemporary", "drama"],
    image: "/Images/classs/04.png",
    accent: "#ff4f86",
  },
  {
    id: "dark",
    icon: "/Images/class_icon/05.png",
    name: "สายดาร์ก",
    title: "ผู้หลงใหลด้านมืด",
    description: "คุณไม่กลัวตัวละครสีเทา ความสัมพันธ์อันตราย หรือด้านมืดที่เรื่องอื่นไม่กล้าเล่า",
    tastes: ["Dark Romance", "Revenge", "Toxic Love"],
    recommendationGenres: ["thriller", "romance", "horror"],
    image: "/Images/classs/05.png",
    accent: "#c93f68",
  },
  {
    id: "reborn",
    icon: "/Images/class_icon/06.png",
    name: "คุณหนูเกิดใหม่",
    title: "ผู้ย้อนชะตา",
    description: "สำหรับคุณ โอกาสครั้งที่สองมีไว้เขียนชะตาใหม่ เอาคืนให้สาสม และเปลี่ยนตอนจบด้วยตัวเอง",
    tastes: ["เกิดใหม่", "ย้อนเวลา", "แก้แค้น", "นางร้าย"],
    recommendationGenres: ["fantasy", "historical", "drama"],
    image: "/Images/classs/06.png",
    accent: "#dfaa55",
  },
  {
    id: "isekai",
    icon: "/Images/class_icon/07.png",
    name: "จอมเวทต่างโลก",
    title: "นักเดินทางข้ามมิติ",
    description: "ยิ่งโลกกว้างและกฎแปลกใหม่เท่าไร คุณยิ่งอยากออกเดินทางไปค้นเวทมนตร์ที่ซ่อนอยู่",
    tastes: ["Fantasy", "Isekai", "เวทมนตร์"],
    recommendationGenres: ["fantasy", "adventure"],
    image: "/Images/classs/07.png",
    accent: "#56b8ff",
  },
  {
    id: "system",
    icon: "/Images/class_icon/08.png",
    name: "ผู้เล่นระบบ",
    title: "ผู้ได้รับระบบ",
    description: "ค่าสถานะ ภารกิจ และการปลดล็อกสกิลคือภาษาที่คุณเข้าใจ ทุกตอนต้องพาเลเวลให้สูงขึ้น",
    tastes: ["System", "Leveling", "Dungeon", "Game"],
    recommendationGenres: ["system", "fantasy", "action"],
    image: "/Images/classs/08.png",
    accent: "#55e0c0",
  },
  {
    id: "mystery",
    icon: "/Images/class_icon/09.png",
    name: "นักไขปริศนา",
    title: "ผู้เปิดโปงความจริง",
    description: "ไม่มีเบาะแสใดเล็กเกินไปสำหรับคุณ ทุกคำโกหกมีรอยร้าว และคุณจะอ่านจนพบความจริง",
    tastes: ["Mystery", "Thriller", "Detective"],
    recommendationGenres: ["mystery", "thriller"],
    image: "/Images/classs/09.png",
    accent: "#d9b36c",
  },
  {
    id: "horror",
    icon: "/Images/class_icon/10.png",
    name: "นักล่าความหลอน",
    title: "ผู้เดินในรัตติกาล",
    description: "ยิ่งบรรยากาศไม่น่าไว้ใจ คุณยิ่งอยากเปิดหน้าถัดไป ความกลัวคือประตูสู่เรื่องเล่าที่ดีที่สุด",
    tastes: ["Horror", "Ghost", "Urban Legend"],
    recommendationGenres: ["horror", "mystery", "thriller"],
    image: "/Images/classs/10.png",
    accent: "#b3a5ff",
  },
  {
    id: "spicy",
    icon: "/Images/class_icon/11.png",
    name: "สายแซ่บ",
    title: "นักอ่านหลังเที่ยงคืน",
    description: "คุณชอบเคมีที่ร้อนแรง ตัวละครที่รู้ใจตัวเอง และความสัมพันธ์ที่ทำให้หน้ากระดาษลุกเป็นไฟ",
    tastes: ["Mature Romance", "20+", "เคมีร้อนแรง"],
    recommendationGenres: ["romance", "drama"],
    image: "/Images/classs/11.png",
    accent: "#ff704d",
  },
  {
    id: "cozy",
    icon: "/Images/class_icon/12.png",
    name: "สายชิล",
    title: "นักอ่านฮีลใจ",
    description: "โลกวุ่นวายแค่ไหนก็พักได้ในเรื่องเล่าดี ๆ คุณมองหาความอบอุ่น ความเรียบง่าย และรอยยิ้มเล็ก ๆ",
    tastes: ["Slice of Life", "Healing", "ทำอาหาร", "ชีวิตประจำวัน"],
    recommendationGenres: ["slice-of-life", "comedy", "contemporary"],
    image: "/Images/classs/12.png",
    accent: "#83c997",
  },
] as const;

export type ReaderClassId = (typeof READER_CLASSES)[number]["id"];
export type QuizQuestionId = "hero" | "pace" | "hook";

export type ReaderClassProfile = {
  version: 2;
  classId: ReaderClassId;
  /** First sub class, retained as a convenient compatibility alias. */
  subClassId: ReaderClassId;
  subClassIds: [ReaderClassId, ReaderClassId];
  selectedClassIds: ReaderClassId[];
  answers: Partial<Record<QuizQuestionId, string>>;
  hiddenTrait: string;
  hiddenTraitEmoji: string;
  completedAt: string;
};

export const QUIZ_QUESTIONS = [
  {
    id: "hero",
    question: "คุณชอบตัวเอกแบบไหน?",
    eyebrow: "ตัวละครที่ใช่",
    options: [
      { id: "overpowered", label: "เก่งตั้งแต่ต้น", detail: "เข้าฉากมาก็พร้อมพลิกเกม", weights: ["system", "isekai", "martial"] },
      { id: "growth", label: "ค่อย ๆ เติบโต", detail: "ล้มได้ ฝึกได้ แล้วกลับมาแกร่งกว่าเดิม", weights: ["martial", "reborn", "cozy"] },
      { id: "strategist", label: "ฉลาดวางแผน", detail: "ชนะด้วยสมองและอ่านคนขาด", weights: ["mystery", "system", "dark"] },
      { id: "antihero", label: "ดาร์ก / ไม่สนโลก", detail: "เทา อันตราย และคาดเดาไม่ได้", weights: ["dark", "horror", "spicy"] },
    ],
  },
  {
    id: "pace",
    question: "เวลาเจอนิยายสนุก คุณจะ…",
    eyebrow: "จังหวะการอ่าน",
    options: [
      { id: "binge", label: "อ่านรวดเดียว", detail: "คืนนี้ยังอีกยาวไกล", weights: ["system", "horror", "spicy"] },
      { id: "stack", label: "ดองไว้เยอะ ๆ", detail: "สะสมให้เต็มที่แล้วค่อยลุย", weights: ["reborn", "martial", "bl"] },
      { id: "daily", label: "อ่านทุกวัน", detail: "มีตอนใหม่เมื่อไรต้องมาเช็ก", weights: ["romance", "yuri", "cozy"] },
      { id: "complete", label: "รอจบค่อยอ่าน", detail: "ขอความสบายใจว่าไปถึงตอนจบแน่", weights: ["mystery", "isekai", "dark"] },
    ],
  },
  {
    id: "hook",
    question: "อะไรทำให้คุณกดอ่านตอนต่อไป?",
    eyebrow: "แรงดึงดูดของเรื่อง",
    options: [
      { id: "chemistry", label: "เคมีของตัวละคร", detail: "แค่สบตาก็รู้ว่ามีเรื่องแน่", weights: ["bl", "yuri", "romance", "spicy"] },
      { id: "new_world", label: "โลกใหม่ที่คาดไม่ถึง", detail: "ยิ่งกฎแปลก ยิ่งอยากสำรวจ", weights: ["isekai", "system", "reborn"] },
      { id: "comeback", label: "การเอาชนะโชคชะตา", detail: "รอดูวันที่ตัวเอกกลับมาเหนือทุกคน", weights: ["martial", "reborn", "dark"] },
      { id: "secret", label: "ความลับที่ยังไม่เฉลย", detail: "วางไม่ได้จนกว่าจะต่อชิ้นส่วนครบ", weights: ["mystery", "horror", "cozy"] },
    ],
  },
] as const;

const PACE_TRAITS: Record<string, { label: string; emoji: string }> = {
  binge: { label: "นักโต้รุ่ง", emoji: "🌙" },
  stack: { label: "นักสะสมตอน", emoji: "📚" },
  daily: { label: "ผู้เฝ้าประตูรายวัน", emoji: "☀️" },
  complete: { label: "นักล่าตอนจบ", emoji: "🏁" },
};

export function getReaderClass(id: string | null | undefined) {
  return READER_CLASSES.find((readerClass) => readerClass.id === id);
}

export function rankSelectedClasses(
  selectedClassIds: readonly ReaderClassId[],
  answers: Partial<Record<QuizQuestionId, string>>,
) {
  const scores = new Map<ReaderClassId, number>();
  selectedClassIds.forEach((id, index) => scores.set(id, selectedClassIds.length - index));

  for (const question of QUIZ_QUESTIONS) {
    const answer = question.options.find((option) => option.id === answers[question.id]);
    if (!answer) continue;
    answer.weights.forEach((id, index) => {
      if (!scores.has(id)) return;
      scores.set(id, (scores.get(id) ?? 0) + answer.weights.length - index);
    });
  }

  return [...selectedClassIds].sort((left, right) => {
    const difference = (scores.get(right) ?? 0) - (scores.get(left) ?? 0);
    return difference || selectedClassIds.indexOf(left) - selectedClassIds.indexOf(right);
  });
}

export function hiddenTraitFor(answers: Partial<Record<QuizQuestionId, string>>) {
  return PACE_TRAITS[answers.pace ?? ""] ?? { label: "นักสำรวจเรื่องเล่า", emoji: "✨" };
}

export function parseReaderClassProfile(raw: string | null): ReaderClassProfile | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Omit<Partial<ReaderClassProfile>, "version"> & { version?: number };
    const selected = Array.isArray(value.selectedClassIds)
      ? value.selectedClassIds.filter((id): id is ReaderClassId => Boolean(getReaderClass(id)))
      : [];
    if (
      (value.version !== 1 && value.version !== 2)
      || !getReaderClass(value.classId)
      || !getReaderClass(value.subClassId)
      || value.classId === value.subClassId
      || selected.length !== 3
    ) return null;

    const storedSubs = Array.isArray(value.subClassIds)
      ? value.subClassIds.filter((id): id is ReaderClassId => Boolean(getReaderClass(id)))
      : [];
    const subClassIds = [
      value.subClassId!,
      storedSubs.find((id) => id !== value.subClassId && id !== value.classId)
        ?? selected.find((id) => id !== value.classId && id !== value.subClassId),
    ];
    if (
      !subClassIds[1]
      || new Set(subClassIds).size !== 2
      || subClassIds.some((id) => id === value.classId || !selected.includes(id!))
    ) return null;

    return {
      version: 2,
      classId: value.classId!,
      subClassId: value.subClassId!,
      subClassIds: subClassIds as [ReaderClassId, ReaderClassId],
      selectedClassIds: selected,
      answers: value.answers ?? {},
      hiddenTrait: typeof value.hiddenTrait === "string" ? value.hiddenTrait : "นักสำรวจเรื่องเล่า",
      hiddenTraitEmoji: typeof value.hiddenTraitEmoji === "string" ? value.hiddenTraitEmoji : "✨",
      completedAt: typeof value.completedAt === "string" ? value.completedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}
