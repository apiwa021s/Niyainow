import { hasPendingTranslationItems, processTranslationJobs } from "@/services/translation-worker";

async function processNextTranslationItem() {
  "use step";

  const { processed } = await processTranslationJobs(1, 1);
  return {
    processed,
    hasPendingItems: await hasPendingTranslationItems(),
  };
}

// The database worker already owns retry/checkpoint semantics. A single
// infrastructure retry covers a step invocation that fails before the worker
// can persist its own retry state.
processNextTranslationItem.maxRetries = 1;

export async function drainTranslationQueue() {
  "use workflow";

  let processed = 0;
  while (true) {
    const state = await processNextTranslationItem();
    processed += state.processed;
    if (!state.hasPendingItems) return { processed };
    // Another workflow owns the claim, or the next retry is not available yet.
    // Exit instead of polling: enqueue starts work immediately and the Vercel
    // cron is the bounded repair path for delayed/orphaned items.
    if (state.processed === 0) return { processed };
  }
}
