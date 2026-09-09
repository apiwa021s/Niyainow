import "server-only";

import type { translationAiModels, translationPromptVersions } from "@/db/schema";
import { parseProviderTranslation } from "@/lib/domain/translation";

type AiModel = typeof translationAiModels.$inferSelect;
type PromptVersion = typeof translationPromptVersions.$inferSelect;

export type TranslationProviderInput = {
  model: AiModel;
  prompt: PromptVersion;
  context: Record<string, unknown>;
  sourceTitle: string;
  sourceContent: string;
};

export type TranslationProviderResult = {
  translation: { title: string; content: string };
  providerRequestId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export type StructuredAiResult = {
  output: unknown;
  providerRequestId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export type StructuredAiInput = {
  model: AiModel;
  systemPrompt: string;
  task: string;
  payload: Record<string, unknown>;
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
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

const DEFAULT_REQUEST_TIMEOUT_MS = 180_000;
const MIN_REQUEST_TIMEOUT_MS = 30_000;
const MAX_REQUEST_TIMEOUT_MS = 240_000;

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

async function requestStructured(input: StructuredAiInput): Promise<StructuredAiResult> {
  const secret = process.env[input.model.apiKeyEnv];
  if (!secret) throw new Error(`Missing configured AI credential: ${input.model.apiKeyEnv}`);
  const startedAt = Date.now();
  const timeoutMs = requestTimeoutMs(input.timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${input.model.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: input.model.modelName,
        messages: [
          { role: "developer", content: input.systemPrompt },
          { role: "user", content: JSON.stringify({ task: input.task, ...input.payload }) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: input.schemaName, strict: true, schema: input.jsonSchema },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`AI ขั้นตอน ${input.task} (${input.model.modelName}) ใช้เวลาเกิน ${Math.round(timeoutMs / 1_000)} วินาที กรุณาลองใหม่`, { cause: error });
    }
    throw error;
  }
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    throw new Error(`Provider request failed with HTTP ${response.status}${requestId ? ` (${requestId})` : ""}`);
  }
  const body = await response.json() as CompatibleResponse;
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Provider returned an empty response");
  let output: unknown;
  try {
    output = JSON.parse(content);
  } catch {
    throw new Error("Provider returned invalid structured JSON");
  }
  return {
    output,
    providerRequestId: body.id ?? response.headers.get("x-request-id"),
    inputTokens: Math.max(0, body.usage?.prompt_tokens ?? 0),
    outputTokens: Math.max(0, body.usage?.completion_tokens ?? 0),
    latencyMs: Date.now() - startedAt,
  };
}

const openAiCompatibleProvider: TranslationProvider = {
  generateStructured: requestStructured,
  async translate(input) {
    const result = await requestStructured({
      model: input.model,
      systemPrompt: input.prompt.systemPrompt,
      task: "Translate the source faithfully. Preserve paragraph breaks and return the complete chapter without summaries or commentary.",
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
      inputTokens: result.inputTokens,
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
