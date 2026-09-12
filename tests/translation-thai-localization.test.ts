import { afterEach, describe, expect, it, vi } from "vitest";

import {
  polishChapterWithCanonAi,
  qaTranslationWithAi,
  translateChapterWithCanonAi,
} from "@/services/ai/translation-pipeline";

const model = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test model",
  provider: "openai-compatible",
  modelName: "test-model",
  baseUrl: "https://provider.example/v1",
  apiKeyEnv: "TEST_AI_KEY",
  inputCostMicrosPerMillion: 1,
  outputCostMicrosPerMillion: 1,
  selectionPriority: 1,
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

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TEST_AI_KEY;
});

describe("Thai novel localization prompts", () => {
  it("requires idiomatic Thai in both translation and QA", async () => {
    process.env.TEST_AI_KEY = "test-secret";
    const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      requests.push(request);
      const payload = JSON.parse(request.messages.at(-1)?.content ?? "{}") as { task: string };
      const output = payload.task === "MAIN_TRANSLATION" || payload.task === "ESCALATION"
        ? {
            translation: { title: "บทที่ 1", content: "เขาดื่มน้ำ แต่ก็ยังดับกระหายไม่ได้" },
            chapterAnalysis: {
              summary: "สรุป",
              continuityFacts: [],
              entities: [],
              glossaryCandidates: [],
              difficulty: "NORMAL",
              translationNotes: [],
            },
          }
        : { passed: true, score: 95, issues: [], correctionInstructions: [] };
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(output) } }],
        usage: { prompt_tokens: 10, completion_tokens: 10 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const context = { sourceLanguage: "en", targetLanguage: "th", profile: { styleGuide: "", instructions: "" } };
    await translateChapterWithCanonAi({
      model,
      prompt,
      sourceTitle: "Chapter 1",
      sourceContent: "He drank, but the water did not satisfy his thirst.",
      context,
    });
    await polishChapterWithCanonAi({
      model,
      sourceTitle: "Chapter 1",
      sourceContent: "He drank, but the water did not satisfy his thirst.",
      translatedTitle: "บทที่ 1",
      translatedContent: "เขาดื่มน้ำ แต่น้ำไม่ได้ทำให้ความกระหายพอใจ",
      context,
    });
    await qaTranslationWithAi({
      model,
      sourceTitle: "Chapter 1",
      sourceContent: "He drank, but the water did not satisfy his thirst.",
      translatedTitle: "บทที่ 1",
      translatedContent: "เขาดื่มน้ำ แต่น้ำไม่ได้ทำให้ความกระหายพอใจ",
      context,
      minimumScore: 92,
    });

    const translationPrompt = requests[0]?.messages[0]?.content ?? "";
    const polishPrompt = requests[1]?.messages[0]?.content ?? "";
    const qaPrompt = requests[2]?.messages[0]?.content ?? "";
    expect(translationPrompt).toContain("natural Thai equivalents");
    expect(translationPrompt).toContain("ดับกระหาย");
    expect(translationPrompt).toContain("no extra blank lines");
    expect(translationPrompt).toContain("comfortable mobile reading");
    expect(polishPrompt).toContain("currentTranslation as the base manuscript");
    expect(polishPrompt).toContain("do not merely make isolated word substitutions");
    expect(qaPrompt).toContain("THAI_TRANSLATIONESE");
    expect(qaPrompt).toContain("THAI_PARAGRAPH_FLOW");

    const polishPayload = JSON.parse(requests[1]?.messages.at(-1)?.content ?? "{}") as {
      currentTranslation?: { content?: string };
    };
    expect(polishPayload.currentTranslation?.content).toContain("ความกระหายพอใจ");

    const qaPayload = JSON.parse(requests[2]?.messages.at(-1)?.content ?? "{}") as {
      quality?: { minimumScore?: number };
    };
    expect(qaPayload.quality?.minimumScore).toBe(92);
  });
});
