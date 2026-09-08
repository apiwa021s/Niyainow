import { Bot, Languages, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./ai-translation-visual.module.css";

export function AiTranslationVisual({ active = false }: { active?: boolean }) {
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
        <span className={styles.eyebrow}><Languages className="h-3.5 w-3.5" /> AI Translation Engine</span>
        <strong>{active ? "กำลังสร้างโลกฉบับแปล…" : "พร้อมเริ่มงานแปลอัตโนมัติ"}</strong>
        <span>{active ? "วิเคราะห์บริบท · รักษาน้ำเสียง · เรียบเรียงภาษา" : "Profile, model routing และคิวตอนทำงานให้เอง"}</span>
      </div>
      <div aria-hidden className={styles.textFlow}>
        <i /><i /><i /><i />
      </div>
    </div>
  );
}

export function AiTranslationProgress({ completed, total, label }: { completed: number; total: number; label: string }) {
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
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
        <p className="mt-1.5 text-xs text-muted-foreground">AI กำลังรักษาบริบท ชื่อตัวละคร และรูปแบบย่อหน้า · {percent}%</p>
      </div>
      <Sparkles aria-hidden className={styles.progressSparkle} />
    </div>
  );
}
