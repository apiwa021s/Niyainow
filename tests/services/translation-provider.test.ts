import { afterEach, describe, expect, it, vi } from "vitest";

import { getTranslationProvider } from "@/services/ai/translation-provider";

const model = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test model",
  provider: "openai-compatible",
  modelName: "gpt-5.6-terra",
  baseUrl: "https://api.openai.com/v1",
  apiKeyEnv: "AI_TRANSLATION_API_KEY",
  inputCostMicrosPerMillion: 2_000_000,
  outputCostMicrosPerMillion: 12_000_000,
  selectionPriority: 100,
  supportedLanguagePairs: ["*"],
  isActive: true,
  createdBy: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.AI_TRANSLATION_API_KEY;
});

describe("translation provider", () => {
  it("calls the configured model with strict structured output", async () => {
    process.env.AI_TRANSLATION_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "req_123",
      choices: [{ message: { content: JSON.stringify({ passed: true }) } }],
      usage: { prompt_tokens: 11, completion_tokens: 3 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getTranslationProvider("openai-compatible").generateStructured({
      model,
      systemPrompt: "Return a QA decision.",
      task: "QA",
      payload: { source: "hello" },
      schemaName: "qa_result",
      jsonSchema: { type: "object", additionalProperties: false, required: ["passed"], properties: { passed: { type: "boolean" } } },
    });

    expect(result.output).toEqual({ passed: true });
    expect(result.inputTokens).toBe(11);
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request.model).toBe("gpt-5.6-terra");
    expect(request.messages[0].role).toBe("developer");
    expect(request.response_format).toMatchObject({ type: "json_schema", json_schema: { strict: true, name: "qa_result" } });
  });

  it("fails closed when the provider returns malformed JSON", async () => {
    process.env.AI_TRANSLATION_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "not-json" } }],
    }), { status: 200 })));

    await expect(getTranslationProvider("openai-compatible").generateStructured({
      model,
      systemPrompt: "Return JSON.",
      task: "TEST",
      payload: {},
      schemaName: "test_result",
      jsonSchema: { type: "object", additionalProperties: false, properties: {}, required: [] },
    })).rejects.toThrow("invalid structured JSON");
  });
});
