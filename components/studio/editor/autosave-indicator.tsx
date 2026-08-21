import { Check, Cloud, Loader2, TriangleAlert } from "lucide-react";

import type { ChapterSaveState } from "@/components/studio/editor/use-chapter-draft";

/** Same visual language as the story wizard's SaveState, plus an error state a chapter draft can actually hit. */
export function AutosaveIndicator({ state }: { state: ChapterSaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-(--text-secondary)">
        <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
        กำลังบันทึก…
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive" role="status">
        <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
        ยังบันทึกไม่ได้ · เราจะลองใหม่อัตโนมัติ
      </span>
    );
  }

  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-(--text-secondary)">
        <Check aria-hidden className="h-3.5 w-3.5 text-emerald-500" />
        บันทึกแล้ว
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-(--text-tertiary)">
      <Cloud aria-hidden className="h-3.5 w-3.5" />
      ร่างอัตโนมัติ
    </span>
  );
}
