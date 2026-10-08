import { afterEach, describe, expect, it, vi } from "vitest";

import {
  qaTranslationWithAi,
  reviseTranslationWithAi,
  reviseTranslationWithPatchesAi,
} from "@/services/ai/translation-pipeline";

const model = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test model",
  provider: "openai-compatible",
  modelName: "gpt-5.6-terra",
  baseUrl: "https://api.openai.com/v1",
  apiKeyEnv: "TEST_AI_KEY",
  inputCostMicrosPerMillion: 2_000_000,
  outputCostMicrosPerMillion: 12_000_000,
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
  systemPrompt: "Translate faithfully.",
  isActive: true,
  createdBy: null,
  createdAt: new Date(0),
};

const qa = { passed: true, score: 95, issues: [], correctionInstructions: [] };
const context = {
  chapterNumber: 1,
  glossary: [{ source: "Harbor Guild", target: "Guild", note: null }],
  chapterAnalysis: { summary: "A meeting at the harbor." },
};
const cache = {
  key: "nw:chapter-review-test",
  stablePayload: { context: { targetLanguage: "th", profile: { instructions: "Preserve character voice." } } },
};
const chapter = {
  model,
  sourceTitle: "Chapter one",
  sourceContent: "They met at the Harbor Guild.",
  translatedTitle: "Translated chapter one",
  translatedContent: "First complete translated draft.",
  context,
  cache,
};

type ResponseRequest = {
  input: Array<{ role: string; content: Array<{ text: string; prompt_cache_breakpoint?: unknown }> }>;
  text: { format: { name: string; strict: boolean } };
  service_tier: string;
};
type ChatRequest = {
  messages: Array<{ role: string; content: string }>;
  response_format: { json_schema: { name: string } };
};

function mockProvider() {
  process.env.TEST_AI_KEY = "test-key";
  const responses: ResponseRequest[] = [];
  const chats: ChatRequest[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as ResponseRequest | ChatRequest;
    const isResponses = "input" in body;
    if (isResponses) responses.push(body);
    else chats.push(body);
    const schemaName = isResponses ? body.text.format.name : body.response_format.json_schema.name;
    const output = schemaName === "translation_correction_patches"
      ? { patches: [], requiresFullRewrite: false, rationale: "The supplied draft is complete." }
      : schemaName === "revised_novel_translation"
        ? { title: chapter.translatedTitle, content: chapter.translatedContent }
        : qa;
    return new Response(JSON.stringify(isResponses
      ? { output_text: JSON.stringify(output), service_tier: "flex", usage: { input_tokens: 2000, output_tokens: 20 } }
      : { choices: [{ message: { content: JSON.stringify(output) } }], usage: { prompt_tokens: 2000, completion_tokens: 20 } }),
    { status: 200, headers: { "content-type": "application/json" } });
  }));
  return { responses, chats };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TEST_AI_KEY;
});

describe("translation review source caching", () => {
  it("reuses the full source and review context while checking each changed draft", async () => {
    const { responses } = mockProvider();
    await qaTranslationWithAi({ ...chapter, minimumScore: 92 });
    await qaTranslationWithAi({ ...chapter, translatedContent: "Corrected complete draft.", minimumScore: 92 });

    expect(responses[1].input.slice(0, 3)).toEqual(responses[0].input.slice(0, 3));
    expect(responses[0].input[1].content[0].prompt_cache_breakpoint).toEqual({ mode: "explicit" });
    expect(responses[0].input[2].content[0].prompt_cache_breakpoint).toEqual({ mode: "explicit" });
    expect(JSON.parse(responses[0].input[2].content[0].text)).toEqual({
      context,
      source: { title: chapter.sourceTitle, content: chapter.sourceContent },
    });
    expect(JSON.parse(responses[1].input[3].content[0].text)).toEqual({
      task: "FIRST_QA",
      quality: { minimumScore: 92 },
      translation: { title: chapter.translatedTitle, content: "Corrected complete draft." },
    });
    expect(responses[0].input[3].content[0]).not.toHaveProperty("prompt_cache_breakpoint");
    expect(responses[0].text.format.strict).toBe(true);
    expect(responses[0].service_tier).toBe("flex");
  });

  it("keeps the global prefix reusable when the chapter source changes", async () => {
    const { responses } = mockProvider();
    await qaTranslationWithAi(chapter);
    await qaTranslationWithAi({ ...chapter, sourceContent: "Updated complete source.", context: { ...context, chapterNumber: 2 } });

    expect(responses[1].input.slice(0, 2)).toEqual(responses[0].input.slice(0, 2));
    expect(JSON.parse(responses[1].input[2].content[0].text)).toMatchObject({
      context: { chapterNumber: 2 },
      source: { content: "Updated complete source." },
    });
    expect(responses[1].input[2]).not.toEqual(responses[0].input[2]);
  });

  it.each(["patch", "rewrite"] as const)("retains all source input without speculative chapter-cache writes for %s correction", async (mode) => {
    const { responses } = mockProvider();
    if (mode === "patch") await reviseTranslationWithPatchesAi({ ...chapter, qa });
    else await reviseTranslationWithAi({ ...chapter, prompt, qa });

    expect(JSON.parse(responses[0].input[2].content[0].text)).toEqual({
      context,
      source: { title: chapter.sourceTitle, content: chapter.sourceContent },
    });
    expect(responses[0].input[1].content[0].prompt_cache_breakpoint).toEqual({ mode: "explicit" });
    expect(responses[0].input[2].content[0]).not.toHaveProperty("prompt_cache_breakpoint");
    expect(JSON.parse(responses[0].input[3].content[0].text)).toEqual({
      task: "ESCALATION",
      translation: { title: chapter.translatedTitle, content: chapter.translatedContent },
      qa,
    });
  });

  it("retains complete source and context on compatible providers without duplication", async () => {
    const { chats } = mockProvider();
    await qaTranslationWithAi({ ...chapter, model: { ...model, baseUrl: "https://provider.example/v1" } });

    expect(chats[0].messages).toHaveLength(3);
    expect(JSON.parse(chats[0].messages[1].content)).toEqual({ shared: cache.stablePayload });
    expect(JSON.parse(chats[0].messages[2].content)).toEqual({
      task: "FIRST_QA",
      context,
      source: { title: chapter.sourceTitle, content: chapter.sourceContent },
      quality: { minimumScore: 90 },
      translation: { title: chapter.translatedTitle, content: chapter.translatedContent },
    });
    expect(chats[0]).not.toHaveProperty("prompt_cache_options");
  });

  it("keeps uncached callers on the existing complete user payload", async () => {
    const { chats } = mockProvider();
    await qaTranslationWithAi({ ...chapter, cache: undefined });

    expect(chats[0].messages).toHaveLength(2);
    expect(JSON.parse(chats[0].messages[1].content)).toMatchObject({
      context,
      source: { title: chapter.sourceTitle, content: chapter.sourceContent },
      translation: { title: chapter.translatedTitle, content: chapter.translatedContent },
    });
  });
});
