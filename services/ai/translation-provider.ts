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

async function requestStructured(input: StructuredAiInput): Promise<StructuredAiResult> {
  const secret = process.env[input.model.apiKeyEnv];
  if (!secret) throw new Error(`Missing configured AI credential: ${input.model.apiKeyEnv}`);
  const startedAt = Date.now();
  const response = await fetch(`${input.model.baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
    signal: AbortSignal.timeout(input.timeoutMs ?? 180_000),
  });
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
