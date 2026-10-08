import { beforeEach, describe, expect, it, vi } from "vitest";

import { chapters, domainOutboxEvents, novelFollows, notifications, users, writerFollows } from "@/db/schema";

const mocks = vi.hoisted(() => ({ db: null as unknown, invalidatePublishedTranslationCache: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/services/translation-publication-cache", () => ({
  invalidatePublishedTranslationCache: mocks.invalidatePublishedTranslationCache,
}));

import { processNotificationOutbox } from "@/services/outbox-service";

function memoryDatabase(options: { translation?: boolean; missingChapter?: boolean; failCompletionOnce?: boolean } = {}) {
  const state = {
    event: {
      id: "event-1", type: "chapter_published", aggregateType: "chapter", aggregateId: "chapter-1",
      dedupeKey: options.translation === false ? "chapter-published:chapter-1" : "translation-published:version-1",
      // Deliberately omit novelSlug to cover publication events made before the bridge existed.
      payload: options.translation === false ? {} : { translationVersionId: "version-1" },
      status: "PENDING", attempts: 0, availableAt: new Date(0), createdAt: new Date(0),
      processedAt: null as Date | null, lastError: null as string | null,
    },
    notifications: [] as Array<Record<string, unknown>>,
  };
  let failCompletion = options.failCompletionOnce ?? false;
  function chain(resolveValue: () => unknown) {
    const query = {
      where: (...args: unknown[]) => { void args; return query; },
      limit: (...args: unknown[]) => { void args; return query; },
      orderBy: (...args: unknown[]) => { void args; return query; },
      for: (...args: unknown[]) => { void args; return query; },
      innerJoin: (...args: unknown[]) => { void args; return query; },
      returning: (...args: unknown[]) => { void args; return query; },
      onConflictDoNothing: () => query,
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve().then(resolveValue).then(resolve, reject),
    };
    return query;
  }
  const db = {
    select: (shape?: Record<string, unknown>) => ({ from: (table: unknown) => chain(() => {
      if (table === domainOutboxEvents) {
        if (shape) return state.event.status === "PROCESSING" ? [{ id: state.event.id }] : [];
        return state.event.status !== "PROCESSED" ? [{ ...state.event }] : [];
      }
      if (table === chapters) return options.missingChapter ? [] : [{
        id: "chapter-1", title: "New chapter", novelId: "novel-1", novelSlug: "sample-novel",
        novelTitle: "Sample novel", writerId: "writer-1", chapterStatus: "PUBLISHED",
        chapterDeletedAt: null, novelStatus: "PUBLISHED", novelDeletedAt: null,
      }];
      if (table === novelFollows || table === writerFollows) return [{ userId: "reader-1" }];
      if (table === users) return [{ id: "reader-1", hideTitle: false }];
      throw new Error("Unexpected select");
    }) }),
    update: (table: unknown) => ({ set: (values: Record<string, unknown>) => chain(() => {
      if (table !== domainOutboxEvents) throw new Error("Unexpected update");
      if (values.status === "PROCESSED" && failCompletion) {
        failCompletion = false;
        throw new Error("completion_write_failed");
      }
      const next = { ...values };
      if (next.attempts !== undefined && typeof next.attempts !== "number") next.attempts = state.event.attempts + 1;
      Object.assign(state.event, next);
      return [{ id: state.event.id }];
    }) }),
    insert: (table: unknown) => ({ values: (values: Array<Record<string, unknown>>) => chain(() => {
      if (table !== notifications) throw new Error("Unexpected insert");
      for (const value of values) {
        if (!state.notifications.some((existing) => existing.userId === value.userId && existing.dedupeKey === value.dedupeKey)) {
          state.notifications.push(value);
        }
      }
      return [];
    }) }),
    transaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
      const snapshot = { event: { ...state.event }, notifications: [...state.notifications] };
      try {
        return await callback(db);
      } catch (error) {
        state.event = snapshot.event;
        state.notifications = snapshot.notifications;
        throw error;
      }
    },
  };
  return { db, state };
}

beforeEach(() => {
  mocks.invalidatePublishedTranslationCache.mockReset().mockResolvedValue(undefined);
});

describe("translation cache publication outbox", () => {
  it("retains failed cache work for retry without sending notifications or rerunning translation", async () => {
    const memory = memoryDatabase();
    mocks.db = memory.db;
    mocks.invalidatePublishedTranslationCache.mockRejectedValueOnce(new Error("REVALIDATION_REQUEST_FAILED"));

    await expect(processNotificationOutbox()).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(memory.state.event.status).toBe("FAILED");
    expect(memory.state.notifications).toHaveLength(0);
    expect(mocks.invalidatePublishedTranslationCache).toHaveBeenCalledWith([{ novelSlug: "sample-novel" }]);

    await expect(processNotificationOutbox(new Date(Date.now() + 10 * 60_000)))
      .resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(memory.state.event.status).toBe("PROCESSED");
    expect(memory.state.event.attempts).toBe(2);
    expect(memory.state.notifications).toHaveLength(1);
  });

  it("rolls back notification writes if completion fails and sends only one notification on retry", async () => {
    const memory = memoryDatabase({ failCompletionOnce: true });
    mocks.db = memory.db;

    await expect(processNotificationOutbox()).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(memory.state.notifications).toHaveLength(0);
    await expect(processNotificationOutbox(new Date(Date.now() + 10 * 60_000)))
      .resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(memory.state.notifications).toHaveLength(1);
    await expect(processNotificationOutbox()).resolves.toEqual({ claimed: 0, processed: 0, failed: 0 });
    expect(memory.state.notifications).toHaveLength(1);
  });

  it("keeps ordinary publication notifications independent of translation bridge configuration", async () => {
    const memory = memoryDatabase({ translation: false });
    mocks.db = memory.db;
    await expect(processNotificationOutbox()).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(mocks.invalidatePublishedTranslationCache).not.toHaveBeenCalled();
    expect(memory.state.notifications).toHaveLength(1);
  });

  it("consumes a hard-deleted aggregate without retrying its cache forever", async () => {
    const memory = memoryDatabase({ missingChapter: true });
    mocks.db = memory.db;
    await expect(processNotificationOutbox()).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(mocks.invalidatePublishedTranslationCache).not.toHaveBeenCalled();
    expect(memory.state.notifications).toHaveLength(0);
  });
});
