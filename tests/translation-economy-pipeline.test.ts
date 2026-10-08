import { afterEach, describe, expect, it, vi } from "vitest";

import { polishAndReviewChapterAi, translateChapterWithCanonAi } from "@/services/ai/translation-pipeline";
import { getTranslationProvider, type StructuredAiInput } from "@/services/ai/translation-provider";

const model = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "GPT-6 Luna",
  provider: "openai-compatible",
  modelName: "gpt-6-luna",
  baseUrl: "https://api.openai.com/v1",
  apiKeyEnv: "TEST_AI_KEY",
  inputCostMicrosPerMillion: 100_000,
  outputCostMicrosPerMillion: 500_000,
  selectionPriority: 100,
  supportedLanguagePairs: ["*"],
  isActive: true,
  createdBy: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const prompt = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "test-prompt",
  version: 1,
  systemPrompt: "Translate faithfully and retain every source passage.",
  isActive: true,
  createdBy: null,
  createdAt: new Date(0),
};
const finalTranslation = { title: "บทที่ 1", content: "เขาดื่มน้ำ แต่ก็ยังดับกระหายไม่ได้\n\nเขาวางแก้วลง" };
const review = {
  passed: false,
  score: 87,
  issues: [{
    code: "THAI_TRANSLATIONESE",
    severity: "WARNING",
    message: "The final sentence still needs editorial attention.",
    location: "CONTENT",
    currentText: "เขาวางแก้วลง",
    suggestedText: "เขาวางแก้ว",
  }],
  correctionInstructions: ["Check the final sentence against the source."],
};
const context = { chapterNumber: 1, glossary: [{ sourceTerm: "Guild", targetTerm: "กิลด์" }] };
const cache = {
  key: "nw:economy-polish",
  stablePayload: { context: { profile: { instructions: "Preserve each speaker's register." }, targetLanguage: "th" } },
};

type ResponseRequest = {
  input: Array<{ role: string; content: Array<{ text: string; prompt_cache_breakpoint?: unknown }> }>;
  reasoning?: { effort: string };
  text: { format: { strict: boolean; schema: Record<string, unknown> } };
};

function mockProvider(output: unknown) {
  process.env.TEST_AI_KEY = "test-secret";
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body));
    return new Response(JSON.stringify("input" in request
      ? { output_text: JSON.stringify(output), service_tier: "flex", usage: { input_tokens: 20_000, output_tokens: 6_000 } }
      : { choices: [{ message: { content: JSON.stringify(output) } }], usage: { prompt_tokens: 20_000, completion_tokens: 6_000 } }),
    { status: 200, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const polishInput = {
  model,
  systemPrompt: prompt.systemPrompt,
  sourceTitle: "Chapter one",
  sourceText: "He drank, but the water did not satisfy his thirst.\n\nHe put down the glass.",
  translation: { title: "ฉบับร่าง", content: "เขาดื่มน้ำ แต่ความกระหายไม่พอใจ\n\nเขาวางแก้วลง" },
  context,
  cache,
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TEST_AI_KEY;
});

describe("economy translation pipeline", () => {
  it("polishes and self-reviews the final complete manuscript in one cheap call without cache writes", async () => {
    const fetchMock = mockProvider({ ...finalTranslation, review });

    const result = await polishAndReviewChapterAi(polishInput);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.value).toEqual({ ...finalTranslation, review });
    expect(result.call).toMatchObject({ task: "ESCALATION", model: { modelName: "gpt-6-luna" } });
    expect(result.call.result).toMatchObject({ promptCacheEnabled: false, inputTokens: 20_000, outputTokens: 6_000 });
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body)) as ResponseRequest;
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.input.flatMap((entry) => entry.content).every((block) => !("prompt_cache_breakpoint" in block))).toBe(true);
    expect(JSON.parse(body.input[1].content[0].text)).toEqual({ shared: cache.stablePayload });
    expect(JSON.parse(body.input[2].content[0].text)).toEqual({
      context,
      source: { title: polishInput.sourceTitle, content: polishInput.sourceText },
    });
    expect(JSON.parse(body.input[3].content[0].text)).toEqual({ task: "ESCALATION", currentTranslation: polishInput.translation });
    expect(body.text.format).toMatchObject({ strict: true, schema: { additionalProperties: false, required: ["title", "content", "review"] } });
    const systemPrompt = body.input[0].content[0].text;
    expect(systemPrompt).toContain("Never summarize, omit passages, invent events");
    expect(systemPrompt).toContain("returned final title or content");
    expect(systemPrompt).toContain("never inflate the score");
    expect(systemPrompt).toContain("natural Thai equivalents");
    expect(systemPrompt).toContain("THAI_PARAGRAPH_FLOW");
  });

  it.each([
    { title: "", content: finalTranslation.content, review },
    { ...finalTranslation, review: { ...review, score: 101 } },
    { ...finalTranslation, review: { ...review, issues: [{ ...review.issues[0], severity: "UNKNOWN" }] } },
  ])("rejects incomplete or invalid final review output", async (output) => {
    mockProvider(output);
    await expect(polishAndReviewChapterAi(polishInput)).rejects.toThrow();
  });

  it("uses low reasoning for cheap draft generation while retaining full source and canon", async () => {
    const chapterAnalysis = { summary: "He remained thirsty.", continuityFacts: [], entities: [], glossaryCandidates: [], difficulty: "NORMAL", translationNotes: [] };
    const fetchMock = mockProvider({ translation: finalTranslation, chapterAnalysis });

    const result = await translateChapterWithCanonAi({
      model,
      prompt,
      sourceTitle: polishInput.sourceTitle,
      sourceContent: polishInput.sourceText,
      context,
      cache: { ...cache, cacheSharedPayload: false },
      reasoningEffort: "low",
    });

    expect(result.value).toEqual({ translation: finalTranslation, chapterAnalysis });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as ResponseRequest;
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(JSON.parse(body.input.at(-1)!.content[0].text)).toEqual({
      task: "MAIN_TRANSLATION",
      context,
      source: { title: polishInput.sourceTitle, content: polishInput.sourceText },
    });
  });

  it("uses Responses for supported reasoning without inventing an empty cached prefix", async () => {
    const fetchMock = mockProvider({ ok: true });
    await getTranslationProvider("openai-compatible").generateStructured({
      model,
      systemPrompt: "Return JSON.",
      task: "MAIN_TRANSLATION",
      reasoningEffort: "low",
      payload: { source: "Full source." },
      schemaName: "test_output",
      jsonSchema: { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } },
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.input).toHaveLength(2);
    expect(body).not.toHaveProperty("prompt_cache_options");
    expect(body).not.toHaveProperty("prompt_cache_key");
  });

  it.each([
    { modelName: "gpt-6-luna", baseUrl: "https://provider.example/v1" },
    { modelName: "gpt-5.6-terra", baseUrl: "https://api.openai.com/v1" },
  ])("keeps reasoning controls away from unsupported providers or models", async (configuration) => {
    const fetchMock = mockProvider({ ok: true });
    const request: StructuredAiInput = {
      model: { ...model, ...configuration },
      systemPrompt: "Return JSON.",
      task: "MAIN_TRANSLATION",
      reasoningEffort: "low",
      cache,
      payload: { source: "Full source." },
      schemaName: "test_output",
      jsonSchema: { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } },
    };
    await getTranslationProvider("openai-compatible").generateStructured(request);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).not.toHaveProperty("reasoning");
    expect(body).not.toHaveProperty("reasoning_effort");
  });
});
