import { Bot, Languages, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./ai-translation-visual.module.css";

const PROFILE_STEPS = [
  { key: "PROFILE_ANALYSIS", label: "วิเคราะห์แนวและน้ำเสียง" },
  { key: "FOUNDATION", label: "สร้างแนวทางการแปล" },
  { key: "PROFILE_QUALITY_REVIEW", label: "ตรวจแนวทางและสำนวน" },
  { key: "METADATA_LOCALIZATION", label: "เกลาชื่อและเรื่องย่อ" },
  { key: "ENTITY_EXTRACTION", label: "สกัดชื่อและศัพท์" },
] as const;

export function AiTranslationVisual({
  active = false,
  failed = false,
  stage,
  stageLabel,
  modelName,
}: {
  active?: boolean;
  failed?: boolean;
  stage?: string | null;
  stageLabel?: string | null;
  modelName?: string | null;
}) {
  const activeIndex = PROFILE_STEPS.findIndex((step) => step.key === stage);
  return (
    <div className={cn(styles.stage, active && styles.active)} role="status" aria-live="polite">
      <div aria-hidden className={styles.ambient} />
      <div aria-hidden className={styles.orbit}>
        <span className={styles.glyphOne}>文</span>
        <span className={styles.glyphTwo}>A</span>
        <span className={styles.glyphThree}>ก</span>
      </div>
      <div aria-hidden className={styles.core}>
        <span className={styles.coreHalo} />
        <Bot className="h-7 w-7" />
        <Sparkles className={styles.sparkle} />
      </div>
      <div className={styles.copy}>
        <span className={styles.eyebrow}><Languages className="h-3.5 w-3.5" /> AI ผู้ช่วยแปล</span>
        <strong>{failed ? "การสร้างแนวทางหยุดชั่วคราว" : active ? stageLabel || "กำลังเตรียมผู้ช่วยแปล…" : "พร้อมช่วยวางแนวทางและแปลเป็นชุด"}</strong>
        <span>{failed ? `${modelName || "เลือกโมเดลอัตโนมัติ"} · ขั้นที่สำเร็จแล้วถูกบันทึกไว้` : active ? `${modelName || "กำลังเลือกโมเดล"} · ตรวจรูปแบบผลลัพธ์ทุกครั้งก่อนบันทึก` : "ระบบเลือกโมเดล สร้างคลังคำ และจัดคิวแต่ละตอนให้อัตโนมัติ"}</span>
        {active || failed ? (
          <ol className={styles.stageSteps} aria-label="ขั้นตอนสร้าง AI Profile">
            {PROFILE_STEPS.map((step, index) => (
              <li key={step.key} data-state={index < activeIndex ? "done" : index === activeIndex ? "active" : "pending"}>
                <span>{index < activeIndex ? "✓" : index + 1}</span>{step.label}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <div aria-hidden className={styles.textFlow}>
        <i /><i /><i /><i />
      </div>
    </div>
  );
}

export function AiTranslationProgress({
  completed,
  total,
  label,
  currentChapter,
  currentStage,
  currentPercent,
}: {
  completed: number;
  total: number;
  label: string;
  currentChapter?: number | null;
  currentStage?: string | null;
  currentPercent?: number | null;
}) {
  const partialItem = currentPercent ? Math.min(100, Math.max(0, currentPercent)) / 100 : 0;
  const percent = total > 0 ? Math.min(100, Math.round(((completed + partialItem) / total) * 100)) : 0;
  return (
    <div className={styles.progressCard} role="status" aria-live="polite">
      <div className={styles.progressIcon} aria-hidden><Bot className="h-5 w-5" /><span /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate font-semibold">{label}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{completed} / {total}</span>
        </div>
        <div className={styles.progressTrack} aria-hidden>
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {currentChapter ? <><strong className="text-foreground">ตอน {currentChapter}</strong> · {currentStage} · {currentPercent ?? 0}%<span aria-hidden> · </span></> : null}
          ออกจากหน้านี้ได้ ระบบจะทำงานต่อเบื้องหลัง · รวม {percent}%
        </p>
      </div>
      <Sparkles aria-hidden className={styles.progressSparkle} />
    </div>
  );
}
