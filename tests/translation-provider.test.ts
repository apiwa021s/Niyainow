import { afterEach, describe, expect, it, vi } from "vitest";

import { aiUsageCostMicros } from "@/services/ai/translation-pipeline";
import { getTranslationProvider, type StructuredAiInput } from "@/services/ai/translation-provider";

function input(baseUrl: string): StructuredAiInput {
  return {
    model: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Test model",
      provider: "openai-compatible",
      modelName: "gpt-5.6-terra",
      baseUrl,
      apiKeyEnv: "TEST_AI_KEY",
      inputCostMicrosPerMillion: 2_000_000,
      outputCostMicrosPerMillion: 12_000_000,
      selectionPriority: 100,
      supportedLanguagePairs: ["*"],
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    systemPrompt: "Stable system prompt",
    task: "FIRST_QA",
    cache: { key: "nw:stable-workspace-task", stablePayload: { context: { profile: "stable" } } },
    payload: { source: { content: "dynamic chapter" } },
    schemaName: "test_output",
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["ok"],
      properties: { ok: { type: "boolean" } },
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TEST_AI_KEY;
});

describe("translation provider prompt caching", () => {
  it("prices modern cached reads and cache writes from reported usage", () => {
    const model = input("https://api.openai.com/v1").model;
    expect(aiUsageCostMicros(model, {
      inputTokens: 2_000,
      cachedInputTokens: 1_024,
      cacheWriteInputTokens: 128,
      outputTokens: 20,
    })).toBe(2_461);
  });

  it("uses Responses explicit caching and reports cache usage for the official OpenAI endpoint", async () => {
    process.env.TEST_AI_KEY = "test-secret";
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({
        id: "resp_test",
        output: [{ content: [{ type: "output_text", text: JSON.stringify({ ok: true }) }] }],
        usage: {
          input_tokens: 2_000,
          output_tokens: 20,
          input_tokens_details: { cached_tokens: 1_024, cache_write_tokens: 128 },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getTranslationProvider("openai-compatible").generateStructured(input("https://api.openai.com/v1"));

    expect(result).toMatchObject({ output: { ok: true }, inputTokens: 2_000, promptCacheEnabled: true, cachedInputTokens: 1_024, cacheWriteInputTokens: 128, outputTokens: 20 });
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(body).toMatchObject({
      store: false,
      prompt_cache_key: "nw:stable-workspace-task",
      prompt_cache_options: { mode: "explicit", ttl: "30m" },
    });
    expect(body.input).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: "developer",
        content: [expect.objectContaining({ prompt_cache_breakpoint: { mode: "explicit" } })],
      }),
    ]));
  });

  it("keeps OpenAI-compatible third-party endpoints on Chat Completions without OpenAI-only options", async () => {
    process.env.TEST_AI_KEY = "test-secret";
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({
        id: "chat_test",
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
        usage: { prompt_tokens: 300, completion_tokens: 10 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getTranslationProvider("openai-compatible").generateStructured(input("https://provider.example/v1"));

    expect(result).toMatchObject({ output: { ok: true }, promptCacheEnabled: false, cachedInputTokens: 0, cacheWriteInputTokens: 0 });
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(url).toBe("https://provider.example/v1/chat/completions");
    expect(body).not.toHaveProperty("prompt_cache_key");
    expect(body).not.toHaveProperty("prompt_cache_options");
  });
});
