export type AutomaticTranslationTask =
  | "PROFILE_ANALYSIS"
  | "FOUNDATION"
  | "ENTITY_EXTRACTION"
  | "CANON_EXTRACTION"
  | "MAIN_TRANSLATION"
  | "FIRST_QA"
  | "ESCALATION"
  | "PREMIUM_EDIT";

export const AUTOMATIC_TRANSLATION_MODELS = [
  { name: "GPT-6 Astra", modelName: "gpt-6-astra", inputCostMicrosPerMillion: 10_000_000, outputCostMicrosPerMillion: 50_000_000 },
  { name: "GPT-5.6 Sol", modelName: "gpt-5.6-sol", inputCostMicrosPerMillion: 4_000_000, outputCostMicrosPerMillion: 20_000_000 },
  { name: "GPT-5.6 Terra", modelName: "gpt-5.6-terra", inputCostMicrosPerMillion: 2_000_000, outputCostMicrosPerMillion: 12_000_000 },
  { name: "GPT-5.6 Luna", modelName: "gpt-5.6-luna", inputCostMicrosPerMillion: 200_000, outputCostMicrosPerMillion: 1_200_000 },
] as const;

export const AUTOMATIC_TRANSLATION_ROUTING: ReadonlyArray<{
  task: AutomaticTranslationTask | "DETERMINISTIC_GLOSSARY";
  label: string;
  modelLabel: string;
  reason: string;
  modelName: string | null;
}> = [
  { task: "PROFILE_ANALYSIS", label: "วิเคราะห์เรื่องครั้งแรก", modelLabel: "GPT-6 Astra", reason: "สร้าง profile แรกที่ดีที่สุด", modelName: "gpt-6-astra" },
  { task: "FOUNDATION", label: "วิเคราะห์ชื่อ + เรื่องย่อ", modelLabel: "Astra / Sol", reason: "สร้าง foundation", modelName: "gpt-6-astra" },
  { task: "ENTITY_EXTRACTION", label: "Extract ชื่อ/ศัพท์/Entity", modelLabel: "GPT-5.6 Luna", reason: "งาน structured ปริมาณมาก ราคาถูก", modelName: "gpt-5.6-luna" },
  { task: "CANON_EXTRACTION", label: "สรุปตอน / Canon extraction", modelLabel: "GPT-5.6 Terra", reason: "ต้องเข้าใจเนื้อหาพอสมควร", modelName: "gpt-5.6-terra" },
  { task: "MAIN_TRANSLATION", label: "แปลนิยายหลัก", modelLabel: "GPT-5.6 Sol", reason: "สมดุลคุณภาพและราคาสำหรับ production", modelName: "gpt-5.6-sol" },
  { task: "FIRST_QA", label: "QA รอบแรก", modelLabel: "GPT-5.6 Terra", reason: "เหมาะกับการตรวจรอบแรก", modelName: "gpt-5.6-terra" },
  { task: "ESCALATION", label: "ตอนยาก / ภาษาโบราณ / อารมณ์หนัก", modelLabel: "GPT-6 Astra", reason: "ยกระดับอัตโนมัติ", modelName: "gpt-6-astra" },
  { task: "PREMIUM_EDIT", label: "Final Editor สำหรับ Premium", modelLabel: "GPT-6 Astra", reason: "คุณภาพสูงสุด", modelName: "gpt-6-astra" },
  { task: "DETERMINISTIC_GLOSSARY", label: "ตรวจ glossary แบบ deterministic", modelLabel: "Code", reason: "ไม่เสีย LLM token", modelName: null },
];

export const AUTOMATIC_TRANSLATION_SYSTEM_PROMPT = `You are the production novel-translation engine for NiyaiNow.
Translate faithfully into the requested target language while preserving meaning, characterization, tone, paragraph boundaries, names, chronology, and continuity.
Use the supplied profile, glossary, character rules, and prior approved context as binding constraints.
Do not summarize, censor, add events, explain your work, or include markdown fences.
Return only a JSON object with non-empty string fields "title" and "content".`;

export function automaticModelNameForTask(task: AutomaticTranslationTask) {
  return AUTOMATIC_TRANSLATION_ROUTING.find((route) => route.task === task)?.modelName ?? "gpt-5.6-sol";
}
