/**
 * Master data for the story wizard.
 *
 * Shaped exactly like the payload the master-data endpoints will return
 * (`GET /api/master-data/<set>`), so swapping these constants for a fetch is a
 * one-line change per set and no component has to change. Writers never create
 * entries here — the lists are admin-controlled, which is what keeps search and
 * recommendations coherent across the catalogue.
 */

export type MasterItem = {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string;
  descriptionTh?: string;
  descriptionEn?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
};

function master(
  rows: readonly (Omit<MasterItem, "slug" | "sortOrder" | "isActive"> & Partial<MasterItem>)[],
): readonly MasterItem[] {
  return rows.map((row, index) => ({
    slug: row.slug ?? row.id,
    sortOrder: row.sortOrder ?? index + 1,
    isActive: row.isActive ?? true,
    ...row,
  })) as readonly MasterItem[];
}

export const PRIMARY_GENRES = master([
  { id: "romance", nameTh: "โรแมนซ์", nameEn: "Romance", icon: "❤️" },
  { id: "dark_romance", nameTh: "ดาร์กโรแมนซ์", nameEn: "Dark Romance", icon: "🖤" },
  { id: "fantasy", nameTh: "แฟนตาซี", nameEn: "Fantasy", icon: "🔮" },
  { id: "supernatural", nameTh: "เหนือธรรมชาติ", nameEn: "Supernatural", icon: "🌙" },
  { id: "historical", nameTh: "ย้อนยุค", nameEn: "Historical", icon: "🏯" },
  { id: "contemporary", nameTh: "ร่วมสมัย / ชีวิตปัจจุบัน", nameEn: "Contemporary", icon: "🏙️" },
  { id: "crime_thriller", nameTh: "อาชญากรรม / ระทึกขวัญ", nameEn: "Crime / Thriller", icon: "🔪" },
  { id: "scifi_apocalypse", nameTh: "ไซไฟ / วันสิ้นโลก", nameEn: "Sci-Fi / Apocalypse", icon: "🛸" },
]);

export const RELATIONSHIP_TYPES = master([
  { id: "mf", nameTh: "ชาย × หญิง", nameEn: "MF" },
  { id: "mm", nameTh: "ชาย × ชาย", nameEn: "BL / MM" },
  { id: "ff", nameTh: "หญิง × หญิง", nameEn: "GL / FF" },
  { id: "multiple", nameTh: "หลายความสัมพันธ์", nameEn: "Multiple / Poly" },
  { id: "other", nameTh: "รูปแบบอื่น", nameEn: "Other" },
]);

export const STORY_SETTINGS = master([
  { id: "modern", nameTh: "โลกปัจจุบัน", nameEn: "Modern" },
  { id: "office", nameTh: "ออฟฟิศ / ที่ทำงาน", nameEn: "Office / Corporate" },
  { id: "university", nameTh: "มหาวิทยาลัย / วัยเรียน", nameEn: "University / Campus" },
  { id: "mafia", nameTh: "มาเฟีย / โลกใต้ดิน", nameEn: "Mafia / Underworld" },
  { id: "historical", nameTh: "ย้อนยุค", nameEn: "Historical" },
  { id: "royal", nameTh: "ราชวงศ์ / ชนชั้นสูง", nameEn: "Royal / Aristocracy" },
  { id: "fantasy_world", nameTh: "โลกแฟนตาซี", nameEn: "Fantasy World" },
  { id: "supernatural", nameTh: "เหนือธรรมชาติ", nameEn: "Supernatural" },
  { id: "omegaverse", nameTh: "โอเมก้าเวิร์ส", nameEn: "Omegaverse" },
  { id: "apocalypse", nameTh: "วันสิ้นโลก", nameEn: "Apocalypse" },
  { id: "scifi", nameTh: "โลกอนาคต / ไซไฟ", nameEn: "Sci-Fi" },
  { id: "showbiz", nameTh: "วงการบันเทิง", nameEn: "Showbiz / Entertainment" },
  { id: "military", nameTh: "ทหาร / หน่วยพิเศษ", nameEn: "Military" },
  { id: "sports", nameTh: "กีฬา", nameEn: "Sports" },
]);

export const TROPES = master([
  { id: "possessive", nameTh: "คลั่งรัก / หวงแรง", nameEn: "Possessive", descriptionTh: "ตัวละครหลักหวงและครอบครองอีกฝ่ายอย่างรุนแรง" },
  { id: "obsessive_love", nameTh: "รักแบบยึดติด", nameEn: "Obsessive Love", descriptionTh: "ความรักที่กลายเป็นความหมกมุ่น" },
  { id: "enemies_to_lovers", nameTh: "จากศัตรูสู่คนรัก", nameEn: "Enemies to Lovers", descriptionTh: "เริ่มจากเกลียดกัน แล้วค่อยกลายเป็นรัก" },
  { id: "friends_to_lovers", nameTh: "จากเพื่อนสู่คนรัก", nameEn: "Friends to Lovers", descriptionTh: "ความสัมพันธ์ที่ข้ามเส้นจากเพื่อนสนิท" },
  { id: "forbidden_love", nameTh: "รักต้องห้าม", nameEn: "Forbidden Love", descriptionTh: "รักที่ผิดกฎ ผิดสถานะ หรือผิดที่ผิดเวลา" },
  { id: "secret_relationship", nameTh: "ความสัมพันธ์ลับ", nameEn: "Secret Relationship", descriptionTh: "คบกันโดยไม่ให้ใครรู้" },
  { id: "age_gap", nameTh: "รักต่างวัย", nameEn: "Age Gap", descriptionTh: "คู่ที่อายุห่างกันมาก" },
  { id: "boss_employee", nameTh: "เจ้านาย × ลูกน้อง", nameEn: "Boss × Employee", descriptionTh: "ความสัมพันธ์ข้ามสายบังคับบัญชา" },
  { id: "mafia", nameTh: "มาเฟีย", nameEn: "Mafia", descriptionTh: "โลกใต้ดินและอำนาจนอกกฎหมาย" },
  { id: "ceo", nameTh: "CEO / นักธุรกิจ", nameEn: "CEO", descriptionTh: "ตัวละครหลักเป็นผู้บริหารหรือนักธุรกิจใหญ่" },
  { id: "marriage_of_convenience", nameTh: "แต่งงานตามข้อตกลง", nameEn: "Marriage of Convenience", descriptionTh: "แต่งงานเพราะผลประโยชน์ก่อน แล้วค่อยมีใจ" },
  { id: "contract_relationship", nameTh: "ความสัมพันธ์ตามสัญญา", nameEn: "Contract Relationship", descriptionTh: "ตกลงเงื่อนไขกันไว้ล่วงหน้า" },
  { id: "fake_dating", nameTh: "แกล้งเป็นแฟน", nameEn: "Fake Dating", descriptionTh: "เริ่มจากการเสแสร้งแล้วกลายเป็นจริง" },
  { id: "one_night_relationship", nameTh: "ความสัมพันธ์ชั่วข้ามคืน", nameEn: "One Night Relationship", descriptionTh: "เริ่มจากคืนเดียวแล้วมีเรื่องต่อ" },
  { id: "second_chance", nameTh: "รักครั้งที่สอง", nameEn: "Second Chance", descriptionTh: "กลับมารักกันอีกครั้งหลังเลิกรา" },
  { id: "revenge", nameTh: "รักท่ามกลางการแก้แค้น", nameEn: "Revenge", descriptionTh: "ความรักที่พันอยู่กับแผนแก้แค้น" },
  { id: "forced_proximity", nameTh: "จำเป็นต้องใกล้ชิดกัน", nameEn: "Forced Proximity", descriptionTh: "สถานการณ์บังคับให้ต้องอยู่ด้วยกัน" },
  { id: "slow_burn", nameTh: "รักค่อยเป็นค่อยไป", nameEn: "Slow Burn", descriptionTh: "ความสัมพันธ์ค่อย ๆ ก่อตัวอย่างช้า ๆ" },
  { id: "fast_burn", nameTh: "ตกหลุมรักรวดเร็ว", nameEn: "Fast Burn", descriptionTh: "รักกันเร็วตั้งแต่ต้นเรื่อง" },
  { id: "love_triangle", nameTh: "รักสามเส้า", nameEn: "Love Triangle", descriptionTh: "มีตัวเลือกมากกว่าหนึ่งคน" },
  { id: "childhood_friends", nameTh: "เพื่อนวัยเด็ก", nameEn: "Childhood Friends", descriptionTh: "รู้จักกันมาตั้งแต่เด็ก" },
  { id: "royalty", nameTh: "ราชวงศ์ / ชนชั้นสูง", nameEn: "Royalty", descriptionTh: "ตัวละครอยู่ในราชวงศ์หรือชนชั้นสูง" },
  { id: "bodyguard", nameTh: "บอดี้การ์ด", nameEn: "Bodyguard", descriptionTh: "ผู้ปกป้องกับผู้ถูกปกป้อง" },
  { id: "celebrity", nameTh: "คนดัง / ดารา", nameEn: "Celebrity", descriptionTh: "ชีวิตในสายตาสาธารณะ" },
  { id: "roommates", nameTh: "รูมเมต / อยู่ร่วมกัน", nameEn: "Roommates", descriptionTh: "อยู่บ้านเดียวกันโดยไม่ได้ตั้งใจ" },
  { id: "opposites_attract", nameTh: "ต่างกันแต่ดึงดูดกัน", nameEn: "Opposites Attract", descriptionTh: "นิสัยตรงข้ามแต่เข้ากันได้" },
  { id: "grumpy_sunshine", nameTh: "คนเย็นชา × คนสดใส", nameEn: "Grumpy × Sunshine", descriptionTh: "คู่ที่อารมณ์ตรงข้ามกันสุดขั้ว" },
  { id: "reunion", nameTh: "กลับมาพบกันอีกครั้ง", nameEn: "Reunion", descriptionTh: "เจอกันอีกครั้งหลังห่างหายไปนาน" },
  { id: "unrequited_love", nameTh: "รักข้างเดียว", nameEn: "Unrequited Love", descriptionTh: "รักที่ยังไม่ได้รับการตอบกลับ" },
  { id: "protective_lead", nameTh: "สายปกป้อง", nameEn: "Protective Lead", descriptionTh: "ตัวละครหลักปกป้องอีกฝ่ายเสมอ" },
]);

export type HeatLevel = {
  level: 1 | 2 | 3 | 4 | 5;
  nameTh: string;
  shortTh: string;
  descriptionTh: string;
};

export const HEAT_LEVELS: readonly HeatLevel[] = [
  {
    level: 1,
    nameTh: "Mature",
    shortTh: "เบา",
    descriptionTh: "เน้นความสัมพันธ์และประเด็นสำหรับผู้ใหญ่ ไม่มีหรือมีฉากเชิงชู้สาวเพียงเล็กน้อย",
  },
  {
    level: 2,
    nameTh: "Suggestive",
    shortTh: "เล็กน้อย",
    descriptionTh: "มีบรรยากาศหรือฉากสำหรับผู้ใหญ่ แต่ไม่ได้เป็นองค์ประกอบหลักของเรื่อง",
  },
  {
    level: 3,
    nameTh: "Explicit บางช่วง",
    shortTh: "ชัดเจน",
    descriptionTh: "มีฉากสำหรับผู้ใหญ่อย่างชัดเจนในบางตอน",
  },
  {
    level: 4,
    nameTh: "Explicit",
    shortTh: "เข้มข้น",
    descriptionTh: "มีฉากสำหรับผู้ใหญ่ค่อนข้างชัดเจนและเกิดขึ้นหลายช่วงของเรื่อง",
  },
  {
    level: 5,
    nameTh: "Very Explicit",
    shortTh: "สูงมาก",
    descriptionTh: "เนื้อหาสำหรับผู้ใหญ่เป็นองค์ประกอบสำคัญของเรื่อง",
  },
];

export const CONTENT_WARNINGS = master([
  { id: "violence", nameTh: "ความรุนแรง", nameEn: "Violence" },
  { id: "strong_language", nameTh: "ภาษารุนแรง / คำหยาบ", nameEn: "Strong Language" },
  { id: "blood_gore", nameTh: "เลือด / ภาพความรุนแรง", nameEn: "Blood / Gore" },
  { id: "death", nameTh: "ความตาย", nameEn: "Death" },
  { id: "psychological", nameTh: "ประเด็นทางจิตใจที่เข้มข้น", nameEn: "Psychological Themes" },
  { id: "abusive_relationship", nameTh: "ความสัมพันธ์ที่ไม่ดีต่อกัน", nameEn: "Abusive Relationship" },
  { id: "power_imbalance", nameTh: "ความสัมพันธ์ที่มีอำนาจไม่เท่ากัน", nameEn: "Power Imbalance" },
  { id: "consent_themes", nameTh: "ประเด็นเกี่ยวกับความยินยอม", nameEn: "Consent-related Themes" },
  { id: "trauma", nameTh: "บาดแผลทางใจ", nameEn: "Trauma" },
  { id: "substance_use", nameTh: "แอลกอฮอล์ / สารเสพติด", nameEn: "Substance Use" },
  { id: "self_harm", nameTh: "การทำร้ายตนเอง", nameEn: "Self-harm Themes" },
  { id: "mental_distress", nameTh: "ภาวะความทุกข์ทางจิตใจ", nameEn: "Mental Distress" },
  { id: "crime", nameTh: "อาชญากรรม", nameEn: "Crime" },
  { id: "kidnapping", nameTh: "การลักพาตัว / กักขัง", nameEn: "Kidnapping / Confinement" },
]);

export const STORY_TYPES = master([
  { id: "serial", nameTh: "นิยายรายตอน", nameEn: "Serial Novel", descriptionTh: "ทยอยลงทีละตอน" },
  { id: "complete_novel", nameTh: "นิยายจบในเล่ม", nameEn: "Complete Novel", descriptionTh: "ลงครบทั้งเรื่องในคราวเดียว" },
  { id: "oneshot", nameTh: "เรื่องสั้น / One Shot", nameEn: "One Shot", descriptionTh: "จบในตอนเดียว" },
  { id: "anthology", nameTh: "รวมเรื่องสั้น", nameEn: "Anthology", descriptionTh: "หลายเรื่องสั้นในชุดเดียวกัน" },
]);

export const STORY_STATUSES = master([
  { id: "ongoing", nameTh: "กำลังเขียน", nameEn: "Ongoing" },
  { id: "completed", nameTh: "จบแล้ว", nameEn: "Completed" },
  { id: "hiatus", nameTh: "พักการเขียน", nameEn: "Hiatus" },
]);

export const CONTENT_ORIGINS = master([
  { id: "original", nameTh: "ผลงานต้นฉบับของฉัน", nameEn: "Original" },
  { id: "licensed_translation", nameTh: "งานแปลที่ได้รับอนุญาต", nameEn: "Licensed Translation" },
  { id: "licensed_adaptation", nameTh: "งานดัดแปลงที่ได้รับอนุญาต", nameEn: "Licensed Adaptation" },
]);

export const CHAPTER_ACCESS_TYPES = [
  { id: "free", nameTh: "อ่านฟรี", nameEn: "Free" },
  { id: "paid", nameTh: "ใช้ Coins", nameEn: "Paid" },
] as const;

/** Coin price tiers a writer can pick from for a paid chapter. */
export const CHAPTER_PRICES = [1, 2, 3, 5, 7] as const;

/** Product rules — one place, so the form, the counters and the review step agree. */
export const STORY_LIMITS = {
  titleMax: 120,
  taglineMax: 200,
  synopsisMax: 3_000,
  secondaryGenresMax: 2,
  settingsMax: 2,
  tropesRecommended: 3,
  tropesMax: 6,
} as const;

export function findMaster(list: readonly MasterItem[], id: string | null | undefined) {
  return id ? list.find((item) => item.id === id) : undefined;
}

export function labelsFor(list: readonly MasterItem[], ids: readonly string[]) {
  return ids.map((id) => findMaster(list, id)?.nameTh).filter((name): name is string => Boolean(name));
}
