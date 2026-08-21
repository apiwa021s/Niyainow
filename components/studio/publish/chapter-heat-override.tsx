import { HeatLevelPicker } from "@/components/studio/shared/heat-level-picker";

/** "ใช้ระดับเนื้อหาตามเรื่อง 🔥 N" until the writer says this one chapter runs hotter or lighter (spec §21). */
export function ChapterHeatOverride({
  storyHeatLevel,
  overrideEnabled,
  overrideLevel,
  onToggleOverride,
  onLevelChange,
}: {
  storyHeatLevel: number;
  overrideEnabled: boolean;
  overrideLevel: number | null;
  onToggleOverride: (enabled: boolean) => void;
  onLevelChange: (level: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold">เนื้อหาตอนนี้แตกต่างจากระดับหลักของเรื่องไหม?</p>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <span className="text-sm">
          เรื่องนี้ · 🔥 ระดับ {storyHeatLevel}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-(--text-secondary)">
          <input
            type="checkbox"
            checked={overrideEnabled}
            onChange={(event) => onToggleOverride(event.target.checked)}
            className="h-4.5 w-4.5 accent-[var(--brand-primary)]"
          />
          ตอนนี้เข้มข้นไม่เท่าเรื่อง
        </label>
      </div>

      {overrideEnabled ? <HeatLevelPicker value={overrideLevel} onChange={onLevelChange} /> : null}
    </div>
  );
}
