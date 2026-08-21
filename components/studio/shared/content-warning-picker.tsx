"use client";

import { SelectableChip } from "@/components/studio/create-story/selectable";
import { CONTENT_WARNINGS } from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

/**
 * The 14-item content-warning chip list — shared between the story wizard
 * and a chapter's per-chapter override. Callers own the surrounding "no
 * warnings" / "inherit from story" toggle; this is just the picker itself.
 */
export function ContentWarningPicker({
  selected,
  onToggle,
  disabled,
  className,
}: {
  selected: readonly string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", disabled && "pointer-events-none opacity-40", className)}>
      {CONTENT_WARNINGS.map((warning) => (
        <SelectableChip
          key={warning.id}
          label={warning.nameTh}
          selected={selected.includes(warning.id)}
          disabled={disabled}
          onToggle={() => onToggle(warning.id)}
        />
      ))}
    </div>
  );
}
