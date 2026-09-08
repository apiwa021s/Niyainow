export type DefaultTranslationProfile = {
  name: string;
  styleGuide: string;
  instructions: string;
  preserveParagraphs: true;
  signals: string[];
};

const STORY_SIGNALS = [
  { label: "กำลังภายใน / บำเพ็ญเพียร", pattern: /cultivat|immortal|martial|sect|wuxia|xianxia|บำเพ็ญ|ยุทธ|สำนัก|เซียน/i },
  { label: "แฟนตาซี", pattern: /fantasy|magic|dragon|demon|เทพ|ปีศาจ|เวทมนตร์|ต่างโลก/i },
  { label: "โรแมนซ์", pattern: /romance|love|marriage|รัก|แต่งงาน|คู่หมั้น/i },
  { label: "สืบสวน / ระทึกขวัญ", pattern: /mystery|detective|crime|thriller|murder|สืบสวน|ฆาตกรรม/i },
  { label: "โลกปัจจุบัน", pattern: /modern|city|school|office|ceo|ปัจจุบัน|โรงเรียน|บริษัท/i },
] as const;

function cleanMetadata(value: string | null | undefined, fallback: string) {
  return value?.replace(/\s+/g, " ").trim() || fallback;
}

/** Builds a safe first-pass profile from metadata only; source chapters are never sent or embedded here. */
export function buildDefaultTranslationProfile(input: {
  title: string;
  synopsis?: string | null;
  sourceLanguage: string;
  targetLanguage: string;
}): DefaultTranslationProfile {
  const title = cleanMetadata(input.title, "Imported novel");
  const synopsis = cleanMetadata(input.synopsis, "ไม่มีเรื่องย่อจากต้นฉบับ");
  const haystack = `${title}\n${synopsis}`;
  const signals = STORY_SIGNALS.filter((signal) => signal.pattern.test(haystack)).map((signal) => signal.label);
  const detected = signals.length ? signals.join(", ") : "นิยายทั่วไป — รักษาน้ำเสียงตามต้นฉบับ";

  return {
    name: `Default · ${title}`.slice(0, 160),
    styleGuide: [
      `# Default Translation Profile`,
      `- แปลจาก ${input.sourceLanguage} เป็น ${input.targetLanguage}`,
      `- สัญญาณจากชื่อเรื่องและเรื่องย่อ: ${detected}`,
      "- ใช้ภาษาไทยเป็นธรรมชาติ ลื่นไหล และรักษาความหมายเดิม",
      "- รักษาน้ำเสียง บุคลิกตัวละคร ลำดับเหตุการณ์ และระดับอารมณ์",
      "- ชื่อเฉพาะ ศัพท์เฉพาะ ระดับพลัง และคำเรียกต้องคงเส้นคงวา",
      "- บทสนทนาต้องอ่านเป็นธรรมชาติและแยกจากคำบรรยายชัดเจน",
      "- รักษาการแบ่งย่อหน้าของต้นฉบับ และไม่เพิ่มหรือตัดเหตุการณ์",
    ].join("\n"),
    instructions: [
      "ใช้ชื่อเรื่องและเรื่องย่อต่อไปนี้เป็นบริบทระดับเรื่อง ห้ามแต่งข้อมูลที่ไม่มีในต้นฉบับ",
      `ชื่อเรื่อง: ${title}`,
      `เรื่องย่อ: ${synopsis}`,
      "หากยังไม่แน่ใจชื่อเฉพาะหรือคำศัพท์ ให้รักษารูปต้นฉบับไว้และส่งให้ Editor ตรวจในรอบ Review",
    ].join("\n\n").slice(0, 20_000),
    preserveParagraphs: true,
    signals,
  };
}
