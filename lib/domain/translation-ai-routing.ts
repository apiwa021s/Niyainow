export type AutomaticTranslationTask =
  | "PROFILE_ANALYSIS"
  | "FOUNDATION"
  | "PROFILE_QUALITY_REVIEW"
  | "METADATA_LOCALIZATION"
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

export const AUTOMATIC_TRANSLATION_PROMPT_VERSION = 6;

export const THAI_NOVEL_LOCALIZATION_RULES = `Thai localization requirements (apply only when targetLanguage is "th" or a Thai locale):
- Write as contemporary Thai commercial fiction. Preserve the source meaning and emotional force, but do not preserve English word order when it sounds translated.
- Render idioms, jokes, exclamations, teasing, and conversational beats with natural Thai equivalents that fit the narrator, character relationship, scene, and register. Use Thai idioms selectively; never add a metaphor, joke, cultural fact, politeness level, intimacy, or intensity that the source does not support.
- Freely reorder clauses and split or merge sentences inside the same source paragraph. Drop recoverable subjects and pronouns, vary attribution naturally, and remove repetition caused only by English grammar.
- Use Thai spacing and punctuation deliberately. Never insert a space inside a word or fixed phrase, and never let subject omission turn two sentences into an ambiguous run-on.
- Format for comfortable mobile reading. Keep each paragraph focused on one narrative beat. Preserve paragraph order and never merge separate source paragraphs, but split an overly dense source paragraph at a natural shift in speaker, action, reaction, thought, time, or focus. Most Thai paragraphs should contain roughly one to three related sentences and stay near or below 220 Thai characters. A paragraph over 260 characters that contains multiple sentences or beats must be split; a single uninterrupted quotation, letter, system message, or deliberate monologue may remain longer. Do not put every sentence in its own paragraph, split dialogue from its attribution, or make arbitrary breaks merely to meet a length target.
- Use exactly one blank line between paragraphs, with no extra blank lines or hard-wrapped lines inside a paragraph.
- Prefer direct Thai collocations such as "ดับกระหาย" over literal constructions such as "ทำให้พอใจจากความกระหาย". Reject calques, stacked abstract nouns, redundant modifiers, and narration such as "ออกความเห็น", "เริ่มที่จะ", "ทำการ", or repeated "ผม/เขา/เธอ" when a natural Thai verb or omission carries the same meaning.
- Read each paragraph once as standalone Thai prose, then compare it with the source again to ensure that polishing did not omit, add, soften, intensify, or change any fact.`;

export function withThaiNovelLocalizationRules(systemPrompt: string) {
  return systemPrompt.includes("Thai localization requirements")
    ? systemPrompt
    : `${systemPrompt}\n${THAI_NOVEL_LOCALIZATION_RULES}`;
}

export const AUTOMATIC_TRANSLATION_ROUTING: ReadonlyArray<{
  task: AutomaticTranslationTask | "DETERMINISTIC_GLOSSARY";
  label: string;
  modelLabel: string;
  reason: string;
  modelName: string | null;
}> = [
  { task: "PROFILE_ANALYSIS", label: "วิเคราะห์เรื่องครั้งแรก", modelLabel: "GPT-6 Astra", reason: "สร้าง profile แรกที่ดีที่สุด", modelName: "gpt-6-astra" },
  { task: "FOUNDATION", label: "วิเคราะห์ชื่อ + เรื่องย่อ", modelLabel: "Astra / Sol", reason: "สร้าง foundation", modelName: "gpt-6-astra" },
  { task: "PROFILE_QUALITY_REVIEW", label: "บรรณาธิการตรวจ Profile", modelLabel: "GPT-6 Astra", reason: "แก้ความทื่อและ translationese ก่อนเริ่มแปล", modelName: "gpt-6-astra" },
  { task: "METADATA_LOCALIZATION", label: "เกลาชื่อและเรื่องย่อ", modelLabel: "GPT-6 Astra", reason: "รักษาข้อเท็จจริงพร้อมปรับเป็นภาษาไทยเชิงบรรณาธิการ", modelName: "gpt-6-astra" },
  { task: "ENTITY_EXTRACTION", label: "Extract ชื่อ/ศัพท์/Entity", modelLabel: "GPT-5.6 Luna", reason: "งาน structured ปริมาณมาก ราคาถูก", modelName: "gpt-5.6-luna" },
  { task: "CANON_EXTRACTION", label: "สรุปตอน / Canon extraction", modelLabel: "GPT-5.6 Terra", reason: "ต้องเข้าใจเนื้อหาพอสมควร", modelName: "gpt-5.6-terra" },
  { task: "MAIN_TRANSLATION", label: "แปลนิยายหลัก", modelLabel: "GPT-5.6 Sol", reason: "สมดุลคุณภาพและราคาสำหรับ production", modelName: "gpt-5.6-sol" },
  { task: "FIRST_QA", label: "QA รอบแรก", modelLabel: "GPT-5.6 Terra", reason: "เหมาะกับการตรวจรอบแรก", modelName: "gpt-5.6-terra" },
  { task: "ESCALATION", label: "ตอนยาก / ภาษาโบราณ / อารมณ์หนัก", modelLabel: "GPT-6 Astra", reason: "ยกระดับอัตโนมัติ", modelName: "gpt-6-astra" },
  { task: "PREMIUM_EDIT", label: "Final Editor สำหรับ Premium", modelLabel: "GPT-6 Astra", reason: "คุณภาพสูงสุด", modelName: "gpt-6-astra" },
  { task: "DETERMINISTIC_GLOSSARY", label: "ตรวจ glossary แบบ deterministic", modelLabel: "Code", reason: "ไม่เสีย LLM token", modelName: null },
];

export const AUTOMATIC_TRANSLATION_SYSTEM_PROMPT = withThaiNovelLocalizationRules(`You are the production novel-translation engine for NiyaiNow.
Translate faithfully into the requested target language while preserving meaning, characterization, tone, paragraph order and semantic structure, names, chronology, and continuity.
Use the supplied profile, glossary, character rules, and prior approved context as binding constraints.
When a locked glossary target contains slash-separated alternatives such as "คุณ / ท่าน", choose exactly one form that fits the scene and register. Do not copy the slash or all alternatives into the prose.
Do not summarize, censor, add events, explain your work, or include markdown fences.
Return only a JSON object with non-empty string fields "title" and "content".`);

export function automaticModelNameForTask(task: AutomaticTranslationTask) {
  return AUTOMATIC_TRANSLATION_ROUTING.find((route) => route.task === task)?.modelName ?? "gpt-5.6-sol";
}
