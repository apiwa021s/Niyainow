import { Plus } from "lucide-react";

import { ContentWarningPicker } from "@/components/studio/shared/content-warning-picker";

/** Defaults to the story's own warnings; a writer only ever adds to them here, never authors new ones (spec §22). */
export function ChapterWarningSelector({
  overrideEnabled,
  selected,
  onEnable,
  onToggle,
}: {
  overrideEnabled: boolean;
  selected: readonly string[];
  onEnable: () => void;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold">คำเตือนของตอนนี้</p>
      {!overrideEnabled ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <span className="text-sm text-(--text-secondary)">ใช้คำเตือนตามเรื่อง</span>
          <button
            type="button"
            onClick={onEnable}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)]"
          >
            <Plus aria-hidden className="h-4 w-4" />
            เพิ่มคำเตือนเฉพาะตอน
          </button>
        </div>
      ) : (
        <ContentWarningPicker selected={selected} onToggle={onToggle} />
      )}
    </div>
  );
}
