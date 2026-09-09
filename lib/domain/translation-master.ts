import { z } from "zod";

export const translationMasterDatasets = [
  "RESEARCH_EVIDENCE",
  "GENRE_PROFILE",
  "SCENE",
  "GLOBAL_RULE",
  "PRESET_RECIPE",
] as const;

export type TranslationMasterDataset = (typeof translationMasterDatasets)[number];
export type TranslationMasterReviewStatus = "DRAFT_FOR_EDITOR_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";

const reviewStatusSchema = z.enum(["DRAFT_FOR_EDITOR_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]);
const stringArraySchema = z.array(z.string());

export const genreProfileSchema = z.object({
  profile_id: z.string().min(1),
  profile_kind: z.string().min(1),
  genre_family: z.string().min(1),
  name_th: z.string().min(1),
  name_en: z.string().min(1),
  activation_conditions_th: z.string().min(1),
  emotion_target_th: z.string().min(1),
  narration_style_th: z.string().min(1),
  dialogue_style_th: z.string().min(1),
  pronoun_honorific_rules_th: z.string().min(1),
  sentence_rhythm_th: z.string().min(1),
  imagery_rules_th: z.string().min(1),
  cultural_localization_rules_th: z.string().min(1),
  terminology_categories_json: stringArraySchema,
  glossary_rules_th: z.string().min(1),
  required_story_memory_json: stringArraySchema,
  avoid_rules_json: stringArraySchema,
  qa_checks_json: stringArraySchema,
  translator_instruction_th: z.string().min(1),
  polish_instruction_th: z.string().min(1),
  recommended_scene_ids_json: stringArraySchema,
  compatible_base_ids_json: stringArraySchema,
  version: z.string().min(1),
  review_status: reviewStatusSchema,
}).passthrough();

export const sceneMasterSchema = z.object({
  scene_id: z.string().min(1),
  name_th: z.string().min(1),
  activation_conditions_th: z.string().min(1),
  emotion_target_th: z.string().min(1),
  translator_instruction_th: z.string().min(1),
  polish_instruction_th: z.string().min(1),
  avoid_rules_json: stringArraySchema,
  qa_checks_json: stringArraySchema,
  required_story_memory_json: stringArraySchema,
  version: z.string().min(1),
  review_status: reviewStatusSchema,
}).passthrough();

export const globalRuleSchema = z.object({
  rule_id: z.string().min(1),
  category: z.string().min(1),
  priority: z.coerce.number().int(),
  name_th: z.string().min(1),
  instruction_th: z.string().min(1),
  validation_th: z.string().min(1),
  version: z.string().min(1),
  review_status: reviewStatusSchema,
}).passthrough();

export const presetRecipeSchema = z.object({
  recipe_id: z.string().min(1),
  name_th: z.string().min(1),
  base_profile_id: z.string().min(1),
  overlay_profile_ids_json: stringArraySchema,
  scene_candidates_json: stringArraySchema,
  selection_reason_th: z.string().min(1),
  activation_guard_th: z.string().min(1),
  runtime_instruction_th: z.string().min(1),
  is_default: z.union([z.boolean(), z.string()]).transform((value) => value === true || String(value).toLowerCase() === "true" || value === "1"),
  version: z.string().min(1),
  review_status: reviewStatusSchema,
}).passthrough();

export type GenreProfileMaster = z.infer<typeof genreProfileSchema>;
export type SceneMaster = z.infer<typeof sceneMasterSchema>;
export type GlobalRuleMaster = z.infer<typeof globalRuleSchema>;
export type PresetRecipeMaster = z.infer<typeof presetRecipeSchema>;

export type TranslationMasterBundle = {
  genres: GenreProfileMaster[];
  scenes: SceneMaster[];
  globalRules: GlobalRuleMaster[];
  recipes: PresetRecipeMaster[];
};

export type TranslationMasterSelection = {
  mode: "MASTER" | "LEGACY_FALLBACK";
  routing: {
    method: "AI_VALIDATED" | "DETERMINISTIC" | "LEGACY_FALLBACK";
    confidence: number | null;
    reason: string | null;
    sourceSignals: string[];
  };
  baseProfile: { id: string; version: string; name: string } | null;
  overlays: Array<{ id: string; version: string; name: string }>;
  recipe: { id: string; version: string; name: string } | null;
  sceneCandidates: Array<{ id: string; version: string; name: string }>;
  globalRuleVersions: string[];
};

export type TranslationMasterRoutingProposal = {
  baseProfileId: string | null;
  overlayProfileIds: string[];
  recipeId: string | null;
  confidence: number;
  reason: string;
  sourceSignals: string[];
};

type CsvFileDefinition = {
  dataset: TranslationMasterDataset;
  keyField: string;
  schema: z.ZodType<Record<string, unknown>>;
};

export const translationMasterFileDefinitions: Record<string, CsvFileDefinition> = {
  "novelnow_research_evidence.csv": {
    dataset: "RESEARCH_EVIDENCE",
    keyField: "evidence_id",
    schema: z.object({ evidence_id: z.string().min(1) }).passthrough(),
  },
  "novelnow_translation_genre_master.csv": { dataset: "GENRE_PROFILE", keyField: "profile_id", schema: genreProfileSchema },
  "novelnow_translation_scene_master.csv": { dataset: "SCENE", keyField: "scene_id", schema: sceneMasterSchema },
  "novelnow_translation_global_rules.csv": { dataset: "GLOBAL_RULE", keyField: "rule_id", schema: globalRuleSchema },
  "novelnow_translation_preset_recipes.csv": { dataset: "PRESET_RECIPE", keyField: "recipe_id", schema: presetRecipeSchema },
};

export type ParsedTranslationMasterRecord = {
  dataset: TranslationMasterDataset;
  recordKey: string;
  version: string;
  reviewStatus: TranslationMasterReviewStatus;
  sourceFile: string;
  payload: Record<string, unknown>;
};

/** RFC-4180-style parser: commas, escaped quotes, CRLF and multiline cells are supported. */
export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("CSV has an unterminated quoted cell");
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value.length)) rows.push(row);
  }
  return rows;
}

function parseJsonColumns(row: Record<string, string>, sourceFile: string, rowNumber: number) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (!key.endsWith("_json")) return [key, value];
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error("expected an array");
      return [key, parsed];
    } catch (error) {
      throw new Error(`${sourceFile} row ${rowNumber}: invalid ${key} (${error instanceof Error ? error.message : "invalid JSON"})`);
    }
  }));
}

export function parseTranslationMasterFiles(files: Array<{ name: string; text: string }>) {
  const parsed: ParsedTranslationMasterRecord[] = [];
  const found = new Set<string>();

  for (const file of files) {
    const name = file.name.toLowerCase();
    const definition = translationMasterFileDefinitions[name];
    if (!definition) continue;
    found.add(name);
    const rows = parseCsv(file.text);
    const headers = rows.shift()?.map((value) => value.trim()) ?? [];
    if (!headers.length) throw new Error(`${file.name}: missing CSV header`);
    rows.forEach((cells, rowIndex) => {
      const raw = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
      const payload = definition.schema.parse(parseJsonColumns(raw, file.name, rowIndex + 2));
      const recordKey = String(payload[definition.keyField] ?? "").trim();
      const version = String(payload.version ?? "1").trim();
      const reviewStatus = reviewStatusSchema.parse(payload.review_status ?? "DRAFT_FOR_EDITOR_REVIEW");
      parsed.push({ dataset: definition.dataset, recordKey, version, reviewStatus, sourceFile: file.name, payload });
    });
  }

  const missing = Object.keys(translationMasterFileDefinitions).filter((name) => !found.has(name));
  if (missing.length) throw new Error(`Missing required master files: ${missing.join(", ")}`);
  validateMasterReferences(parsed);
  return parsed;
}

function validateMasterReferences(records: ParsedTranslationMasterRecord[]) {
  const ids = (dataset: TranslationMasterDataset) => new Set(records.filter((row) => row.dataset === dataset).map((row) => row.recordKey));
  const profiles = ids("GENRE_PROFILE");
  const scenes = ids("SCENE");
  const evidence = ids("RESEARCH_EVIDENCE");

  for (const record of records) {
    const payload = record.payload;
    const check = (field: string, valid: Set<string>) => {
      for (const id of Array.isArray(payload[field]) ? payload[field] as unknown[] : []) {
        if (typeof id === "string" && !valid.has(id)) throw new Error(`${record.sourceFile} ${record.recordKey}: unknown ${field} reference ${id}`);
      }
    };
    check("evidence_ids_json", evidence);
    check("recommended_scene_ids_json", scenes);
    check("scene_candidates_json", scenes);
    check("compatible_base_ids_json", profiles);
    check("overlay_profile_ids_json", profiles);
    if (record.dataset === "PRESET_RECIPE") {
      const baseId = String(payload.base_profile_id ?? "");
      if (!profiles.has(baseId)) throw new Error(`${record.sourceFile} ${record.recordKey}: unknown base_profile_id ${baseId}`);
    }
  }
}

const PROFILE_ALIASES: Record<string, string[]> = {
  G001: ["contemporary romance", "modern romance", "campus romance", "office romance"],
  G002: ["romantic comedy", "romcom", "rom-com"],
  G003: ["relationship drama", "second chance romance", "divorce romance"],
  G004: ["chinese historical romance", "ancient china romance", "historical romance"],
  G005: ["retro china", "1970s china", "1980s china", "1990s china"],
  G006: ["slice of life", "cozy", "family", "healing", "cooking", "farming"],
  G007: ["romantic fantasy", "fantasy romance", "romantasy"],
  G008: ["wuxia", "martial arts", "jianghu"],
  G009: ["xianxia", "cultivation", "immortal cultivation", "qi cultivation"],
  G010: ["epic fantasy", "adventure fantasy", "high fantasy"],
  G011: ["dark fantasy", "grimdark"],
  G012: ["system", "hunter", "progression fantasy", "leveling"],
  G013: ["gamelit", "vrmmo", "litrpg", "online game"],
  G014: ["apocalypse", "post-apocalyptic", "survival", "zombie"],
  G015: ["horror", "supernatural horror", "paranormal horror"],
  G016: ["mystery", "detective", "crime investigation", "whodunit"],
  G017: ["psychological thriller", "thriller", "suspense"],
  G018: ["science fiction", "sci-fi", "space opera", "cyberpunk"],
  G019: ["esports", "e-sports", "competitive gaming"],
  G020: ["entertainment industry", "idol", "showbiz", "livestream", "streamer"],
  G021: ["urban cultivation", "modern cultivation", "cultivation comedy"],
  G022: ["political intrigue", "court intrigue", "royal court", "palace politics"],
  G023: ["dark romance", "dangerous romance"],
  O001: ["boy love", "boys love", "bl romance", "male male romance", "danmei"],
  O002: ["girls love", "girl love", "gl romance", "female female romance", "yuri"],
  O003: ["regression", "rebirth", "reincarnation", "second life", "time travel"],
  O004: ["transmigration", "isekai", "body swap", "another world"],
  O005: ["quick transmigration", "world hopping", "multiple worlds"],
  O006: ["revenge", "face slapping", "reversal"],
  O007: ["slow burn", "slow-burn"],
  O008: ["power imbalance", "boss", "mafia", "billionaire"],
  O009: ["omegaverse", "alpha beta omega", "abo"],
  O010: ["chat fiction", "social media", "forum posts", "text messages"],
  O011: ["mature themes", "sexual violence", "trauma", "abuse"],
  O012: ["antihero", "villain protagonist", "villain viewpoint"],
};

const BASE_FAMILY_DEFAULTS: Record<string, string> = {
  ROMANCE: "G001",
  HISTORICAL: "G004",
  SLICE_OF_LIFE: "G006",
  FANTASY: "G010",
  EASTERN_FANTASY: "G009",
  PROGRESSION: "G012",
  GAME: "G013",
  SURVIVAL: "G014",
  HORROR: "G015",
  MYSTERY: "G016",
  THRILLER: "G017",
  SCIENCE_FICTION: "G018",
  CONTEMPORARY: "G020",
  POLITICAL: "G022",
};

function matchScore(profile: GenreProfileMaster, haystack: string, includeFamily: boolean) {
  const aliases = [profile.name_en, ...(PROFILE_ALIASES[profile.profile_id] ?? [])];
  const aliasScore = aliases.reduce((score, alias) => {
    const normalized = alias.toLowerCase().trim();
    return score + (normalized && haystack.includes(normalized) ? normalized.split(/\s+/).length + 2 : 0);
  }, 0);
  if (!includeFamily) return aliasScore;
  const family = profile.genre_family.replaceAll("_", " ").toLowerCase();
  return aliasScore + (family !== "general" && haystack.includes(family) ? 1 : 0);
}

function compactProfile(profile: GenreProfileMaster) {
  return {
    id: profile.profile_id,
    version: profile.version,
    name: profile.name_th,
  };
}

export function selectTranslationMasterContext(bundle: TranslationMasterBundle, analysis: {
  genre: string;
  subgenres: string[];
  tone: string;
  narrativeVoice: string;
  terminologyRisks: string[];
}, proposal?: TranslationMasterRoutingProposal | null) {
  const haystack = [analysis.genre, ...analysis.subgenres, analysis.tone, analysis.narrativeVoice, ...analysis.terminologyRisks]
    .join(" ").toLowerCase().replace(/[_/]+/g, " ");
  const baseProfiles = bundle.genres.filter((profile) => profile.profile_kind === "BASE_GENRE");
  const base = baseProfiles
    .filter((profile) => profile.profile_id !== "G000")
    .map((profile) => ({ profile, score: matchScore(profile, haystack, true) }))
    .sort((left, right) => right.score - left.score
      || Number(BASE_FAMILY_DEFAULTS[right.profile.genre_family] === right.profile.profile_id) - Number(BASE_FAMILY_DEFAULTS[left.profile.genre_family] === left.profile.profile_id)
      || left.profile.profile_id.localeCompare(right.profile.profile_id))[0];
  const proposedBase = proposal && proposal.confidence >= 60
    ? baseProfiles.find((profile) => profile.profile_id === proposal.baseProfileId)
    : null;
  const selectedBase = proposedBase ?? (base?.score ? base.profile : baseProfiles.find((profile) => profile.profile_id === "G000") ?? null);
  if (!selectedBase) return null;

  const matchedOverlays = bundle.genres
    .filter((profile) => profile.profile_kind !== "BASE_GENRE")
    .map((profile) => ({ profile, score: matchScore(profile, haystack, false) }))
    .filter(({ profile, score }) => score > 0 && (!profile.compatible_base_ids_json.length || profile.compatible_base_ids_json.includes(selectedBase.profile_id)))
    .sort((left, right) => right.score - left.score || left.profile.profile_id.localeCompare(right.profile.profile_id))
    .slice(0, 4)
    .map(({ profile }) => profile);
  const proposedOverlays = proposal && proposedBase
    ? [...new Set(proposal.overlayProfileIds)].map((id) => bundle.genres.find((profile) => profile.profile_id === id))
      .filter((profile): profile is GenreProfileMaster => Boolean(profile && profile.profile_kind !== "BASE_GENRE"))
      .filter((profile) => !profile.compatible_base_ids_json.length || profile.compatible_base_ids_json.includes(selectedBase.profile_id))
      .slice(0, 4)
    : [];
  const overlays = proposedBase ? proposedOverlays : matchedOverlays;

  const overlayIds = new Set(overlays.map((profile) => profile.profile_id));
  const compatibleRecipes = bundle.recipes
    .filter((candidate) => candidate.base_profile_id === selectedBase.profile_id
      && candidate.overlay_profile_ids_json.every((id) => overlayIds.has(id)));
  const proposedRecipe = proposal && proposedBase
    ? compatibleRecipes.find((candidate) => candidate.recipe_id === proposal.recipeId) ?? null
    : null;
  const recipe = proposedRecipe ?? compatibleRecipes
    .map((candidate) => ({
      candidate,
      score: candidate.overlay_profile_ids_json.filter((id) => overlayIds.has(id)).length * 10
        - candidate.overlay_profile_ids_json.filter((id) => !overlayIds.has(id)).length,
    }))
    .sort((left, right) => right.score - left.score || Number(right.candidate.is_default) - Number(left.candidate.is_default))[0]?.candidate ?? null;

  const sceneIds = new Set([
    ...selectedBase.recommended_scene_ids_json,
    ...overlays.flatMap((profile) => profile.recommended_scene_ids_json),
    ...(recipe?.scene_candidates_json ?? []),
  ]);
  const scenes = bundle.scenes.filter((scene) => sceneIds.has(scene.scene_id));
  const rules = [...bundle.globalRules].sort((left, right) => left.priority - right.priority || left.rule_id.localeCompare(right.rule_id));
  const guidance = {
    precedence: "Story-specific approved glossary, character voice, canon and source text override this general master.",
    base: profilePromptFields(selectedBase),
    overlays: overlays.map(profilePromptFields),
    recipe: recipe ? {
      id: recipe.recipe_id,
      instruction: recipe.runtime_instruction_th,
      guard: recipe.activation_guard_th,
    } : null,
    sceneCandidates: scenes.map((scene) => ({
      id: scene.scene_id,
      name: scene.name_th,
      activateOnlyWhen: scene.activation_conditions_th,
      instruction: scene.translator_instruction_th,
      polish: scene.polish_instruction_th,
      avoid: scene.avoid_rules_json,
      qa: scene.qa_checks_json,
    })),
    globalRules: rules.map((rule) => ({ id: rule.rule_id, priority: rule.priority, name: rule.name_th, instruction: rule.instruction_th, validation: rule.validation_th })),
  };
  const selection: TranslationMasterSelection = {
    mode: "MASTER",
    routing: proposedBase ? {
      method: "AI_VALIDATED",
      confidence: proposal?.confidence ?? null,
      reason: proposal?.reason ?? null,
      sourceSignals: proposal?.sourceSignals.slice(0, 8) ?? [],
    } : {
      method: "DETERMINISTIC",
      confidence: null,
      reason: "AI routing was unavailable, low-confidence, or invalid; used validated deterministic matching.",
      sourceSignals: [],
    },
    baseProfile: compactProfile(selectedBase),
    overlays: overlays.map(compactProfile),
    recipe: recipe ? { id: recipe.recipe_id, version: recipe.version, name: recipe.name_th } : null,
    sceneCandidates: scenes.map((scene) => ({ id: scene.scene_id, version: scene.version, name: scene.name_th })),
    globalRuleVersions: rules.map((rule) => `${rule.rule_id}@${rule.version}`),
  };
  return { key: selectedBase.profile_id, label: selectedBase.name_th, guidance: JSON.stringify(guidance), selection };
}

export function buildTranslationMasterRoutingCatalog(bundle: TranslationMasterBundle) {
  return {
    profiles: bundle.genres.map((profile) => ({
      id: profile.profile_id,
      kind: profile.profile_kind,
      family: profile.genre_family,
      nameTh: profile.name_th,
      nameEn: profile.name_en,
      activateOnlyWhen: profile.activation_conditions_th,
      compatibleBaseIds: profile.compatible_base_ids_json,
    })),
    recipes: bundle.recipes.map((recipe) => ({
      id: recipe.recipe_id,
      name: recipe.name_th,
      baseProfileId: recipe.base_profile_id,
      overlayProfileIds: recipe.overlay_profile_ids_json,
      activateOnlyWhen: recipe.activation_guard_th,
      selectionReason: recipe.selection_reason_th,
    })),
  };
}

function profilePromptFields(profile: GenreProfileMaster) {
  return {
    id: profile.profile_id,
    version: profile.version,
    name: profile.name_th,
    activateOnlyWhen: profile.activation_conditions_th,
    emotionToPreserve: profile.emotion_target_th,
    narration: profile.narration_style_th,
    dialogue: profile.dialogue_style_th,
    pronounsAndHonorifics: profile.pronoun_honorific_rules_th,
    rhythm: profile.sentence_rhythm_th,
    imagery: profile.imagery_rules_th,
    localization: profile.cultural_localization_rules_th,
    glossary: profile.glossary_rules_th,
    translatorInstruction: profile.translator_instruction_th,
    polishInstruction: profile.polish_instruction_th,
    avoid: profile.avoid_rules_json,
    qa: profile.qa_checks_json,
  };
}
