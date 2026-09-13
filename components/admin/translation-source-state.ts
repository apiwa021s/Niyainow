export type TranslationSourceStateKey =
  | "NOT_STARTED"
  | "PROFILE"
  | "ACTIVE"
  | "ATTENTION"
  | "READY"
  | "UNAVAILABLE";

export type TranslationSourceState = {
  key: TranslationSourceStateKey;
  label: string;
  detail: string;
  tone: "success" | "danger" | "warning" | "info" | "neutral" | "brand";
  priority: number;
};

export type TranslationSourceSummary = {
  sourceLanguage: string;
  chapterCount: number;
  synopsis?: string | null;
};

export type TranslationWorkspaceSummary = {
  status: string;
  activeJobCount: number;
  needsReviewCount: number;
  publishReadyCount: number;
  publishedCount: number;
  chapterCount: number;
  profileGenerationStage: string | null;
  profileGenerationError: string | null;
};

const PROFILE_STAGE_LABELS: Record<string, string> = {
  CONNECTING: "กำลังเตรียมข้อมูล",
  PROFILE_ANALYSIS: "วิเคราะห์แนวและน้ำเสียง",
  FOUNDATION: "สร้างแนวทางการแปล",
  PROFILE_QUALITY_REVIEW: "ตรวจแนวทางและสำนวน",
  METADATA_LOCALIZATION: "เกลาชื่อและเรื่องย่อ",
  ENTITY_EXTRACTION: "สกัดชื่อและศัพท์",
  COMPLETE: "สร้าง Profile เสร็จแล้ว",
};

export function profileStageLabel(stage: string | null | undefined) {
  if (!stage) return "รอเริ่มสร้าง Profile";
  return PROFILE_STAGE_LABELS[stage] ?? stage;
}

export function getTranslationSourceState(
  source: TranslationSourceSummary,
  workspace: TranslationWorkspaceSummary | undefined,
  targetLanguage: string,
): TranslationSourceState {
  const normalizedTarget = targetLanguage.trim().toLocaleLowerCase();
  const normalizedSource = source.sourceLanguage.trim().toLocaleLowerCase();

  if (!workspace && normalizedTarget && normalizedSource === normalizedTarget) {
    return {
      key: "UNAVAILABLE",
      label: "ภาษาเดียวกับต้นฉบับ",
      detail: "เลือกภาษาปลายทางอื่นก่อนสร้าง Profile",
      tone: "warning",
      priority: 5,
    };
  }

  if (!workspace && source.chapterCount === 0 && !source.synopsis?.trim()) {
    return {
      key: "UNAVAILABLE",
      label: "ข้อมูลไม่พอ",
      detail: "ต้องมีเรื่องย่อหรือตอนต้นฉบับอย่างน้อย 1 ตอน",
      tone: "danger",
      priority: 4,
    };
  }

  if (!workspace) {
    return {
      key: "NOT_STARTED",
      label: "ยังไม่เริ่ม",
      detail: source.chapterCount > 0
        ? `พร้อมสร้าง Profile ภาษา ${normalizedTarget.toUpperCase()}`
        : "พร้อมสร้าง Profile จากเรื่องย่อเท่านั้น",
      tone: "neutral",
      priority: 6,
    };
  }

  if (workspace.profileGenerationError) {
    return {
      key: "ATTENTION",
      label: "Profile หยุดชั่วคราว",
      detail: `หยุดที่ ${profileStageLabel(workspace.profileGenerationStage)} · ทำต่อจาก Checkpoint ได้`,
      tone: "danger",
      priority: 0,
    };
  }

  if (workspace.status === "SETUP" || (workspace.profileGenerationStage && workspace.profileGenerationStage !== "COMPLETE")) {
    return {
      key: "PROFILE",
      label: "Profile ยังไม่เสร็จ",
      detail: profileStageLabel(workspace.profileGenerationStage),
      tone: "info",
      priority: 1,
    };
  }

  if (workspace.activeJobCount > 0) {
    return {
      key: "ACTIVE",
      label: "AI กำลังทำงาน",
      detail: `${workspace.activeJobCount.toLocaleString("th-TH")} งานกำลังรันหรือรอคิว`,
      tone: "info",
      priority: 2,
    };
  }

  if (workspace.status === "FAILED" || workspace.status === "QA_FAILED") {
    return {
      key: "ATTENTION",
      label: "งานมีข้อผิดพลาด",
      detail: "เปิดงานเพื่อตรวจข้อผิดพลาดและลองใหม่",
      tone: "danger",
      priority: 0,
    };
  }

  if (workspace.needsReviewCount > 0) {
    return {
      key: "ATTENTION",
      label: "รอตรวจแก้",
      detail: `${workspace.needsReviewCount.toLocaleString("th-TH")} ตอนต้องตรวจหรือแก้ QA`,
      tone: "warning",
      priority: 0,
    };
  }

  if (["STALE", "PARTIAL"].includes(workspace.status)) {
    return {
      key: "ATTENTION",
      label: workspace.status === "STALE" ? "ต้นฉบับเปลี่ยน" : "สำเร็จบางส่วน",
      detail: workspace.status === "STALE" ? "ตรวจตอนที่เปลี่ยนก่อนแปลต่อ" : "ตรวจรายการที่ไม่สำเร็จแล้วลองใหม่",
      tone: "warning",
      priority: 0,
    };
  }

  const total = workspace.chapterCount;
  const published = workspace.publishedCount;
  const detail = total > 0 && published >= total
    ? `เผยแพร่ครบ ${total.toLocaleString("th-TH")} ตอนแล้ว`
    : workspace.publishReadyCount > 0
      ? `${workspace.publishReadyCount.toLocaleString("th-TH")} ตอนพร้อมเผยแพร่`
      : published > 0
        ? `เผยแพร่แล้ว ${published.toLocaleString("th-TH")} / ${total.toLocaleString("th-TH")} ตอน`
        : "Profile พร้อม · เลือกตอนเพื่อเริ่มแปล";

  return {
    key: "READY",
    label: "พร้อมใช้งาน",
    detail,
    tone: "success",
    priority: 3,
  };
}
