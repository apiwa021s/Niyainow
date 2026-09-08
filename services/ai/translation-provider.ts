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

export interface TranslationProvider {
  translate(input: TranslationProviderInput): Promise<TranslationProviderResult>;
}

type CompatibleResponse = {
  id?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

const openAiCompatibleProvider: TranslationProvider = {
  async translate(input) {
    const secret = process.env[input.model.apiKeyEnv];
    if (!secret) throw new Error(`Missing configured AI credential: ${input.model.apiKeyEnv}`);
    const startedAt = Date.now();
    const response = await fetch(`${input.model.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: input.model.modelName,
        messages: [
          { role: "system", content: input.prompt.systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              task: "Translate the source faithfully. Return only JSON with string fields title and content. Preserve paragraph breaks.",
              context: input.context,
              source: { title: input.sourceTitle, content: input.sourceContent },
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Provider request failed with HTTP ${response.status}`);
    const body = await response.json() as CompatibleResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("Provider returned an empty response");
    return {
      translation: parseProviderTranslation(content),
      providerRequestId: body.id ?? null,
      inputTokens: Math.max(0, body.usage?.prompt_tokens ?? 0),
      outputTokens: Math.max(0, body.usage?.completion_tokens ?? 0),
      latencyMs: Date.now() - startedAt,
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
