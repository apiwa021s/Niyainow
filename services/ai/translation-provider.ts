import "server-only";

import type { translationAiModels, translationPromptVersions } from "@/db/schema";
import { parseProviderTranslation } from "@/lib/domain/translation";

type AiModel = typeof translationAiModels.$inferSelect;
type PromptVersion = typeof translationPromptVersions.$inferSelect;

export type TranslationProviderInput = {
  model: AiModel;
  prompt: PromptVersion;
  context: Record<string, unknown>;
  cache?: PromptCacheInput;
  sourceTitle: string;
  sourceContent: string;
};

export type PromptCacheInput = {
  key: string;
  stablePayload: Record<string, unknown>;
};

export type TranslationProviderResult = {
  translation: { title: string; content: string };
  providerRequestId: string | null;
  serviceTier?: string | null;
  inputTokens: number;
  promptCacheEnabled: boolean;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export type StructuredAiResult = {
  output: unknown;
  providerRequestId: string | null;
  serviceTier?: string | null;
  inputTokens: number;
  promptCacheEnabled: boolean;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export type StructuredAiInput = {
  model: AiModel;
  systemPrompt: string;
  task: string;
  serviceTier?: "auto" | "default" | "flex";
  payload: Record<string, unknown>;
  cache?: PromptCacheInput;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  timeoutMs?: number;
};

export interface TranslationProvider {
  translate(input: TranslationProviderInput): Promise<TranslationProviderResult>;
  generateStructured(input: StructuredAiInput): Promise<StructuredAiResult>;
}

type CompatibleResponse = {
  id?: string;
  service_tier?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  };
};

type OpenAiResponsesResponse = {
  id?: string;
  service_tier?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  };
};

const DEFAULT_REQUEST_TIMEOUT_MS = 900_000;
const MIN_REQUEST_TIMEOUT_MS = 30_000;
const MAX_REQUEST_TIMEOUT_MS = 900_000;

function requestTimeoutMs(explicitTimeoutMs?: number) {
  const configuredTimeoutMs = Number(process.env.AI_TRANSLATION_REQUEST_TIMEOUT_MS);
  const candidate = explicitTimeoutMs ?? (Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_REQUEST_TIMEOUT_MS);
  return Math.min(MAX_REQUEST_TIMEOUT_MS, Math.max(MIN_REQUEST_TIMEOUT_MS, Math.round(candidate)));
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (
    error.name === "TimeoutError"
    || /aborted due to timeout|timed?\s*out/i.test(error.message)
  );
}

function isOfficialOpenAiEndpoint(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname.toLocaleLowerCase() === "api.openai.com";
  } catch {
    return false;
  }
}

function requestServiceTier(input: StructuredAiInput) {
  if (!isOfficialOpenAiEndpoint(input.model.baseUrl)) return null;
  if (input.serviceTier) return input.serviceTier;
  const configured = process.env.AI_TRANSLATION_SERVICE_TIER?.trim().toLowerCase() || "flex";
  if (configured === "auto" || configured === "default" || configured === "flex") return configured;
  throw new Error("AI_TRANSLATION_SERVICE_TIER must be one of: flex, default, auto");
}

async function postAiRequest(input: StructuredAiInput, endpoint: string, body: Record<string, unknown>) {
  const secret = process.env[input.model.apiKeyEnv];
  if (!secret) throw new Error(`Missing configured AI credential: ${input.model.apiKeyEnv}`);
  const timeoutMs = requestTimeoutMs(input.timeoutMs);
  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`AI ขั้นตอน ${input.task} (${input.model.modelName}) ใช้เวลาเกิน ${Math.round(timeoutMs / 1_000)} วินาที กรุณาลองใหม่`, { cause: error });
    }
    throw error;
  }
}

function parseStructuredOutput(content: string | null | undefined) {
  if (!content) throw new Error("Provider returned an empty response");
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("Provider returned invalid structured JSON");
  }
}

function normalizedCacheUsage(inputTokens: number, cachedTokens: number | undefined, cacheWriteTokens: number | undefined) {
  const cachedInputTokens = Math.min(inputTokens, Math.max(0, cachedTokens ?? 0));
  const cacheWriteInputTokens = Math.min(inputTokens - cachedInputTokens, Math.max(0, cacheWriteTokens ?? 0));
  return { cachedInputTokens, cacheWriteInputTokens };
}

async function requestStructuredWithResponses(input: StructuredAiInput, startedAt: number): Promise<StructuredAiResult> {
  const stablePayload = JSON.stringify({ shared: input.cache?.stablePayload ?? {} });
  const dynamicPayload = JSON.stringify({ task: input.task, ...input.payload });
  const serviceTier = requestServiceTier(input);
  const response = await postAiRequest(input, `${input.model.baseUrl.replace(/\/$/, "")}/responses`, {
    model: input.model.modelName,
    ...(serviceTier ? { service_tier: serviceTier } : {}),
    store: false,
    input: [
      { role: "developer", content: [{ type: "input_text", text: input.systemPrompt }] },
      {
        role: "developer",
        content: [{ type: "input_text", text: stablePayload, prompt_cache_breakpoint: { mode: "explicit" } }],
      },
      { role: "user", content: [{ type: "input_text", text: dynamicPayload }] },
    ],
    prompt_cache_key: input.cache?.key,
    prompt_cache_options: { mode: "explicit", ttl: "30m" },
    text: {
      format: { type: "json_schema", name: input.schemaName, strict: true, schema: input.jsonSchema },
    },
  });
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    throw new Error(`Provider request failed with HTTP ${response.status}${requestId ? ` (${requestId})` : ""}`);
  }
  const body = await response.json() as OpenAiResponsesResponse;
  const content = body.output_text
    ?? body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  const inputTokens = Math.max(0, body.usage?.input_tokens ?? 0);
  const cacheUsage = normalizedCacheUsage(
    inputTokens,
    body.usage?.input_tokens_details?.cached_tokens,
    body.usage?.input_tokens_details?.cache_write_tokens,
  );
  return {
    output: parseStructuredOutput(content),
    providerRequestId: body.id ?? response.headers.get("x-request-id"),
    serviceTier: body.service_tier ?? null,
    inputTokens,
    promptCacheEnabled: true,
    ...cacheUsage,
    outputTokens: Math.max(0, body.usage?.output_tokens ?? 0),
    latencyMs: Date.now() - startedAt,
  };
}

async function requestStructuredWithChatCompletions(input: StructuredAiInput, startedAt: number): Promise<StructuredAiResult> {
  const messages = [
    { role: "developer", content: input.systemPrompt },
    ...(input.cache ? [{ role: "developer", content: JSON.stringify({ shared: input.cache.stablePayload }) }] : []),
    { role: "user", content: JSON.stringify({ task: input.task, ...input.payload }) },
  ];
  const serviceTier = requestServiceTier(input);
  const response = await postAiRequest(input, `${input.model.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    model: input.model.modelName,
    ...(serviceTier ? { service_tier: serviceTier } : {}),
    messages,
    response_format: {
      type: "json_schema",
      json_schema: { name: input.schemaName, strict: true, schema: input.jsonSchema },
    },
  });
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    throw new Error(`Provider request failed with HTTP ${response.status}${requestId ? ` (${requestId})` : ""}`);
  }
  const body = await response.json() as CompatibleResponse;
  const inputTokens = Math.max(0, body.usage?.prompt_tokens ?? 0);
  const cacheUsage = normalizedCacheUsage(
    inputTokens,
    body.usage?.prompt_tokens_details?.cached_tokens,
    body.usage?.prompt_tokens_details?.cache_write_tokens,
  );
  return {
    output: parseStructuredOutput(body.choices?.[0]?.message?.content),
    providerRequestId: body.id ?? response.headers.get("x-request-id"),
    serviceTier: body.service_tier ?? null,
    inputTokens,
    promptCacheEnabled: false,
    ...cacheUsage,
    outputTokens: Math.max(0, body.usage?.completion_tokens ?? 0),
    latencyMs: Date.now() - startedAt,
  };
}

async function requestStructured(input: StructuredAiInput): Promise<StructuredAiResult> {
  const startedAt = Date.now();
  return input.cache && isOfficialOpenAiEndpoint(input.model.baseUrl)
    ? requestStructuredWithResponses(input, startedAt)
    : requestStructuredWithChatCompletions(input, startedAt);
}

const openAiCompatibleProvider: TranslationProvider = {
  generateStructured: requestStructured,
  async translate(input) {
    const result = await requestStructured({
      model: input.model,
      systemPrompt: input.prompt.systemPrompt,
      task: "Translate the source faithfully. Preserve paragraph order; for mobile readability, split only overly dense paragraphs at natural narrative beats. Return the complete chapter without summaries or commentary.",
      cache: input.cache,
      payload: { context: input.context, source: { title: input.sourceTitle, content: input.sourceContent } },
      schemaName: "novel_translation",
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "content"],
        properties: {
          title: { type: "string", minLength: 1 },
          content: { type: "string", minLength: 1 },
        },
      },
    });
    return {
      translation: parseProviderTranslation(JSON.stringify(result.output)),
      providerRequestId: result.providerRequestId,
      serviceTier: result.serviceTier,
      inputTokens: result.inputTokens,
      promptCacheEnabled: result.promptCacheEnabled,
      cachedInputTokens: result.cachedInputTokens,
      cacheWriteInputTokens: result.cacheWriteInputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    };
  },
};

const providerRegistry = new Map<string, TranslationProvider>([
  ["openai-compatible", openAiCompatibleProvider],
]);

export function getTranslationProvider(provider: string) {
  const adapter = providerRegistry.get(provider);
  if (!adapter) throw new Error(`Unsupported translation provider: ${provider}`);
  return adapter;
}
