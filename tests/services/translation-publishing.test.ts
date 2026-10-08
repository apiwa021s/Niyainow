import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

import {
  chapters,
  domainOutboxEvents,
  novelImportSources,
  novelImportSourceTexts,
  novels,
  translationChapters,
  translationQaIssues,
  translationVersions,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/dal";
import { publishTranslationVersionInTransaction, resolveTranslationPublishingActor } from "@/services/translation-publication-service";

vi.mock("@/lib/auth/dal", () => ({ assertTranslationPermission: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/redis/invalidation", () => ({ invalidateChapterCache: vi.fn(), invalidateNovelCache: vi.fn() }));
vi.mock("@/services/translation-master-service", () => ({ getTranslationMasterOverview: vi.fn(), loadApprovedTranslationMasterBundle: vi.fn() }));

const actor: CurrentUser = { id: "admin-1", role: "ADMIN", status: "ACTIVE", email: null, name: null, image: null };
const workspaceId = "workspace-1";
const chapterId = "chapter-1";
const versionId = "version-1";

function publishingTransaction(options: { versionStatus?: string; chapterStatus?: string; latestRevision?: number; critical?: number } = {}) {
  const row = {
    workspace: { id: workspaceId, importSourceId: "source-1", novelId: "novel-1", sourceLanguage: "en", targetLanguage: "th" },
    translationChapter: { id: chapterId, linkedChapterId: "public-chapter-1", chapterNumber: 242, status: options.chapterStatus ?? "APPROVED" },
    version: { id: versionId, revision: 2, title: "Latest translated title", content: "Latest translated content", status: options.versionStatus ?? "APPROVED", publishedAt: null },
    novel: { id: "novel-1", slug: "translated-novel", language: "th", title: "Edited public title", titleOriginal: "Original title", publishedAt: null },
  };
  const publicChapter = { id: "public-chapter-1", status: "DRAFT", title: "Older title", content: "Older content" };
  const events = new Map<string, unknown>();
  const inserts: unknown[] = [];
  const mutations: unknown[] = [];
  const chain = (result: () => unknown) => {
    const builder = {
      where: () => builder,
      limit: () => builder,
      orderBy: () => builder,
      for: () => builder,
      innerJoin: () => builder,
      leftJoin: () => builder,
      returning: () => builder,
      onConflictDoNothing: () => builder,
      onConflictDoUpdate: () => builder,
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve().then(result).then(resolve, reject),
    };
    return builder;
  };
  const tx = {
    select: (selection?: Record<string, unknown>) => ({ from: (table: unknown) => chain(() => {
      if (table === translationVersions) return selection?.workspace ? [structuredClone(row)] : [{ value: options.latestRevision ?? 2 }];
      if (table === translationQaIssues) return [{ value: options.critical ?? 0 }];
      if (table === novelImportSources) return [{ id: "source-1" }];
      if (table === novelImportSourceTexts) return [{ language: "en", title: "Imported title", synopsis: "Source synopsis" }];
      if (table === novels) return [row.novel];
      if (table === chapters) return selection?.total ? [{ total: 1, published: publicChapter.status === "PUBLISHED" ? 1 : 0 }] : [publicChapter];
      throw new Error("Unexpected publishing select");
    }) }),
    insert: (table: unknown) => ({ values: (value: Record<string, unknown>) => chain(() => {
      inserts.push(table);
      if (table === domainOutboxEvents) events.set(String(value.dedupeKey), value);
      mutations.push({ table, value });
      return [];
    }) }),
    update: (table: unknown) => ({ set: (value: Record<string, unknown>) => chain(() => {
      mutations.push({ table, value });
      if (table === chapters) { Object.assign(publicChapter, value); return [{ id: publicChapter.id }]; }
      if (table === novels) return [{ id: row.novel.id }];
      if (table === translationVersions && value.status === "PUBLISHED") Object.assign(row.version, value);
      if (table === translationChapters) Object.assign(row.translationChapter, value);
      return [];
    }) }),
  };
  return { tx: tx as unknown as Parameters<typeof publishTranslationVersionInTransaction>[0], row, publicChapter, inserts, events, mutations };
}

beforeEach(() => vi.clearAllMocks());

describe("translation publication transaction", () => {
  it("publishes the latest text through the existing public chapter and deduplicates the event on retry", async () => {
    const fixture = publishingTransaction();
    const publish = () => publishTranslationVersionInTransaction(fixture.tx, actor, workspaceId, chapterId, versionId);
    expect(await publish()).toMatchObject({ versionId, publicChapterId: "public-chapter-1", novelSlug: "translated-novel" });
    expect(fixture.publicChapter).toMatchObject({ status: "PUBLISHED", title: "Latest translated title", content: "Latest translated content" });
    expect(fixture.row.translationChapter.status).toBe("PUBLISHED");
    expect(fixture.row.version.status).toBe("PUBLISHED");
    await publish();
    expect(fixture.inserts).not.toContain(chapters);
    expect(fixture.inserts).not.toContain(novels);
    expect(fixture.events.size).toBe(1);
    expect(fixture.row.novel.title).toBe("Edited public title");
  });

  it.each([
    [{ versionStatus: "DRAFT" }, "APPROVAL_REQUIRED"],
    [{ chapterStatus: "STALE" }, "CURRENT_APPROVAL_REQUIRED"],
    [{ chapterStatus: "REVIEW" }, "CURRENT_APPROVAL_REQUIRED"],
    [{ latestRevision: 3 }, "LATEST_REVISION_REQUIRED"],
    [{ critical: 1 }, "QA_BLOCKING"],
  ])("rejects unsafe publication without writing public content", async (options, code) => {
    const fixture = publishingTransaction(options);
    await expect(publishTranslationVersionInTransaction(fixture.tx, actor, workspaceId, chapterId, versionId)).rejects.toMatchObject({ code });
    expect(fixture.mutations).toHaveLength(0);
  });

  it("rejects editor publishing rights before querying the transaction", async () => {
    await expect(publishTranslationVersionInTransaction(null as unknown as Parameters<typeof publishTranslationVersionInTransaction>[0], { ...actor, role: "EDITOR" }, workspaceId, chapterId, versionId))
      .rejects.toMatchObject({ status: 403 });
  });
});

describe("background publication actor", () => {
  function actorTransaction(user: CurrentUser | null) {
    let condition: { sql: string; params: unknown[] } | null = null;
    const lock = vi.fn();
    const tx = { select: () => ({ from: (table: unknown) => {
      expect(table).toBe(users);
      return { where: (where: SQL) => {
        condition = new PgDialect().sqlToQuery(where);
        return { limit: () => ({ for: async (kind: string) => { lock(kind); return user ? [user] : []; } }) };
      } };
    } }) };
    return { tx: tx as unknown as Parameters<typeof resolveTranslationPublishingActor>[0], lock, condition: () => condition };
  }

  it("uses the current database role and holds it until the publication commits", async () => {
    const fixture = actorTransaction(actor);
    expect(await resolveTranslationPublishingActor(fixture.tx, actor.id)).toEqual(actor);
    expect(fixture.condition()?.params).toEqual([actor.id]);
    expect(fixture.condition()?.sql).toContain('"users"."deleted_at" is null');
    expect(fixture.lock).toHaveBeenCalledWith("share");
  });

  it.each([
    null,
    { ...actor, role: "EDITOR" as const },
    { ...actor, status: "SUSPENDED" as const },
    { ...actor, status: "BANNED" as const },
    { ...actor, status: "DELETED" as const },
  ])("does not publish for a missing, demoted or inactive requester", async (user) => {
    expect(await resolveTranslationPublishingActor(actorTransaction(user).tx, actor.id)).toBeNull();
  });

  it("does not invent an actor for jobs without a requester", async () => {
    expect(await resolveTranslationPublishingActor(null as unknown as Parameters<typeof resolveTranslationPublishingActor>[0], null)).toBeNull();
  });
});
