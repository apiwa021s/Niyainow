import { describe, expect, it } from "vitest";

import { getTranslationSourceState, profileStageLabel, type TranslationWorkspaceSummary } from "@/components/admin/translation-source-state";

const source = {
  sourceLanguage: "en",
  chapterCount: 24,
  synopsis: "A complete synopsis",
};

const workspace: TranslationWorkspaceSummary = {
  status: "READY",
  activeJobCount: 0,
  needsReviewCount: 0,
  publishReadyCount: 0,
  publishedCount: 0,
  chapterCount: 24,
  profileGenerationStage: "COMPLETE",
  profileGenerationError: null,
};

describe("translation source workflow state", () => {
  it("distinguishes sources that have not started from ready workspaces", () => {
    expect(getTranslationSourceState(source, undefined, "th").key).toBe("NOT_STARTED");
    expect(getTranslationSourceState(source, workspace, "th")).toMatchObject({
      key: "READY",
      label: "พร้อมใช้งาน",
    });
  });

  it("surfaces profile progress and resumable profile errors", () => {
    expect(getTranslationSourceState(source, {
      ...workspace,
      status: "SETUP",
      profileGenerationStage: "FOUNDATION",
    }, "th")).toMatchObject({
      key: "PROFILE",
      detail: "สร้างแนวทางการแปล",
    });

    expect(getTranslationSourceState(source, {
      ...workspace,
      status: "SETUP",
      profileGenerationStage: "PROFILE_QUALITY_REVIEW",
      profileGenerationError: "provider timed out",
    }, "th")).toMatchObject({
      key: "ATTENTION",
      label: "Profile หยุดชั่วคราว",
      tone: "danger",
    });
  });

  it("prioritizes active AI work and chapters needing review", () => {
    expect(getTranslationSourceState(source, { ...workspace, activeJobCount: 2 }, "th")).toMatchObject({
      key: "ACTIVE",
      detail: "2 งานกำลังรันหรือรอคิว",
    });
    expect(getTranslationSourceState(source, { ...workspace, needsReviewCount: 7 }, "th")).toMatchObject({
      key: "ATTENTION",
      label: "รอตรวจแก้",
    });
  });

  it("blocks same-language and context-free sources with an exact reason", () => {
    expect(getTranslationSourceState(source, undefined, "EN")).toMatchObject({
      key: "UNAVAILABLE",
      label: "ภาษาเดียวกับต้นฉบับ",
    });
    expect(getTranslationSourceState({ ...source, chapterCount: 0, synopsis: "" }, undefined, "th")).toMatchObject({
      key: "UNAVAILABLE",
      label: "ข้อมูลไม่พอ",
    });
  });

  it("allows synopsis-only profile creation and explains the reduced context", () => {
    expect(getTranslationSourceState({ ...source, chapterCount: 0 }, undefined, "th")).toMatchObject({
      key: "NOT_STARTED",
      detail: "พร้อมสร้าง Profile จากเรื่องย่อเท่านั้น",
    });
  });

  it("labels every known profile checkpoint in Thai", () => {
    expect(profileStageLabel("ENTITY_EXTRACTION")).toBe("สกัดชื่อและศัพท์");
    expect(profileStageLabel(null)).toBe("รอเริ่มสร้าง Profile");
  });
});
