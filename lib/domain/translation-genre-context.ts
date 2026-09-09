export type TranslationGenreContext = {
  key: string;
  label: string;
  guidance: string;
};

const CONTEXTS: Array<TranslationGenreContext & { patterns: RegExp }> = [
  {
    key: "cultivation",
    label: "บำเพ็ญเซียน / กำลังภายใน / จีนแฟนตาซี",
    patterns: /xianxia|xuanhuan|wuxia|cultivation|martial arts|仙侠|玄幻|武侠|บำเพ็ญ|เซียน|ยุทธ์|กำลังภายใน|ลมปราณ/u,
    guidance: "Build a stable hierarchy for cultivation realms, sect ranks, techniques, honorifics, weapons, pills, and spiritual objects. In Thai, prefer established Chinese-fantasy register and natural modifier order; do not mechanically translate moral labels or English intermediary syntax. Keep personal names transliterated consistently unless the source clearly uses a meaningful title.",
  },
  {
    key: "historical",
    label: "ย้อนยุค / ราชสำนัก / ประวัติศาสตร์",
    patterns: /historical|ancient|court intrigue|palace|dynasty|ย้อนยุค|ราชสำนัก|วังหลวง|ประวัติศาสตร์|ยุคโบราณ/u,
    guidance: "Track social rank, kinship, court titles, forms of address, calendar conventions, and political factions. Use readable period flavor rather than forced archaic wording. Dialogue register must follow status and relationship without inventing titles unsupported by the source.",
  },
  {
    key: "romance",
    label: "โรแมนซ์ / ดราม่าความสัมพันธ์",
    patterns: /romance|romantic|relationship|รัก|โรแมนซ์|แต่งงาน|คู่รัก|ดราม่า/u,
    guidance: "Preserve emotional subtext, intimacy level, relationship dynamics, nicknames, and pronoun changes. Prefer natural target-language dialogue over literal sentence order. Do not intensify affection, hostility, or consent beyond the source.",
  },
  {
    key: "mystery",
    label: "สืบสวน / ระทึกขวัญ",
    patterns: /mystery|detective|thriller|crime|investigation|สืบสวน|ปริศนา|ฆาตกรรม|ระทึกขวัญ/u,
    guidance: "Preserve clue wording, uncertainty, chronology, aliases, evidence, and deliberate ambiguity. Avoid explanatory additions that reveal deductions early. Keep procedural terminology consistent and prose tense without obscuring factual distinctions.",
  },
  {
    key: "horror",
    label: "สยองขวัญ / เหนือธรรมชาติ",
    patterns: /horror|supernatural|ghost|occult|สยอง|ผี|ลี้ลับ|ไสยศาสตร์|เหนือธรรมชาติ/u,
    guidance: "Protect pacing, sensory detail, uncertainty, and recurring supernatural rules. Use vivid but controlled target-language prose; do not explain the unknown, soften dread, or add gore absent from the source.",
  },
  {
    key: "game-system",
    label: "เกม / ระบบ / LitRPG",
    patterns: /litrpg|game|system|level|skill|quest|เกม|ระบบ|เลเวล|สกิล|เควสต์/u,
    guidance: "Create a fixed UI vocabulary for stats, skills, classes, ranks, quests, notifications, and system messages. Preserve numbers, brackets, labels, and repeated templates exactly while keeping narrative and dialogue separate from interface text.",
  },
  {
    key: "modern",
    label: "ร่วมสมัย / เมือง",
    patterns: /contemporary|modern|urban|office|school life|ร่วมสมัย|ปัจจุบัน|ในเมือง|ออฟฟิศ|โรงเรียน/u,
    guidance: "Use current, idiomatic target-language narration and dialogue appropriate to age, profession, and relationship. Avoid literary archaism and translationese. Localize generic expressions naturally while retaining culture-specific institutions and proper nouns.",
  },
];

const GENERAL_CONTEXT: TranslationGenreContext = {
  key: "general-fiction",
  label: "นิยายทั่วไป / แฟนตาซี",
  guidance: "Infer register from the supplied chapter samples. Preserve worldbuilding categories, names, titles, point of view, and dialogue relationships consistently. Favor idiomatic target-language prose and natural sentence rhythm over source-language word order without changing meaning.",
};

const THAI_GUIDANCE = `Thai localization quality rules:
- Reorder modifiers and clauses into natural Thai; do not preserve English or Chinese syntax mechanically.
- Avoid bureaucratic filler, repeated pronouns, excessive passive voice, and abstract moral nouns when a concrete genre term is intended.
- Choose pronouns, particles, honorifics, and levels of politeness from character relationships and scene context, then keep them consistent.
- Novel titles must read like native Thai publishing titles: concise, memorable, genre-appropriate, and faithful rather than word-for-word.
- Preserve paragraph intent and emotional beat, but split overlong source sentences when Thai readability requires it.`;

export function selectTranslationGenreContext(input: {
  genre: string;
  subgenres: string[];
  tone: string;
  targetLanguage: string;
}) {
  const haystack = [input.genre, ...input.subgenres, input.tone].join(" ").toLocaleLowerCase();
  const selected = CONTEXTS.find((context) => context.patterns.test(haystack)) ?? GENERAL_CONTEXT;
  return {
    key: selected.key,
    label: selected.label,
    guidance: `${selected.guidance}${input.targetLanguage.toLocaleLowerCase().startsWith("th") ? `\n\n${THAI_GUIDANCE}` : ""}`,
  } satisfies TranslationGenreContext;
}
