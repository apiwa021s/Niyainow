"use client";

import { Check, Search } from "lucide-react";
import { useId, useState } from "react";

import type { MasterItem } from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

/**
 * Selection primitives for the wizard.
 *
 * Every one of them signals "selected" with a mark and a border as well as
 * colour, so the state survives a colour-blind reader and a greyscale screen —
 * and every hit area clears 44px.
 */

export function SelectableCard({
  item,
  selected,
  disabled,
  onToggle,
}: {
  item: MasterItem;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "tap-target relative grid min-h-28 place-items-center gap-1 rounded-xl border p-4 text-center transition-[border-color,background-color,box-shadow] duration-[var(--dur-fast)]",
        selected
          ? "border-[var(--brand-emphasis)] bg-accent-subtle shadow-[var(--sh-brand)]"
          : "border-border bg-card hover:border-[var(--brand-emphasis)]",
        disabled && "cursor-not-allowed opacity-40 hover:border-border",
      )}
    >
      {selected ? (
        <Check aria-hidden className="absolute right-2 top-2 h-4 w-4 text-[var(--brand-emphasis)]" />
      ) : null}
      {item.icon ? (
        <span aria-hidden className="text-2xl leading-none">
          {item.icon}
        </span>
      ) : null}
      <span className={cn("text-sm font-semibold leading-6", selected && "text-[var(--brand-emphasis)]")}>{item.nameTh}</span>
      <span className="text-[11px] text-(--text-tertiary)">{item.nameEn}</span>
    </button>
  );
}

export function SelectableChip({
  label,
  hint,
  selected,
  disabled,
  onToggle,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      title={hint}
      className={cn(
        "tap-target inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-[var(--dur-fast)]",
        selected
          ? "border-[var(--brand-emphasis)] bg-accent-subtle font-semibold text-[var(--brand-emphasis)]"
          : "border-border bg-card text-(--text-secondary) hover:border-[var(--brand-emphasis)]",
        disabled && "cursor-not-allowed opacity-40 hover:border-border",
      )}
    >
      {selected ? <Check aria-hidden className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}

export function SearchableChipSelector({
  items,
  selected,
  max,
  onChange,
  searchPlaceholder,
  emptyText,
}: {
  items: readonly MasterItem[];
  selected: readonly string[];
  max: number;
  onChange: (next: string[]) => void;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const visible = term
    ? items.filter(
        (item) =>
          item.nameTh.toLowerCase().includes(term) ||
          item.nameEn.toLowerCase().includes(term) ||
          (item.descriptionTh ?? "").toLowerCase().includes(term),
      )
    : items;

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((value) => value !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };

  return (
    <div>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-11 w-full rounded-(--r-md) border border-border bg-card pl-9 pr-3 text-sm transition-colors duration-[var(--dur-fast)] placeholder:text-(--text-tertiary) hover:border-[var(--brand-emphasis)]"
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm leading-7 text-(--text-secondary)">{emptyText}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {visible.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <SelectableChip
                key={item.id}
                label={item.nameTh}
                hint={item.descriptionTh}
                selected={isSelected}
                disabled={!isSelected && selected.length >= max}
                onToggle={() => toggle(item.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** "เลือกแล้ว 4 / 6" — always visible so a disabled chip never looks broken. */
export function SelectionCounter({ count, max, unit = "แบบ" }: { count: number; max: number; unit?: string }) {
  return (
    <p aria-live="polite" className="text-xs text-(--text-tertiary)">
      เลือกแล้ว <span className="font-semibold tabular-nums text-(--text-secondary)">{count}</span> / {max} {unit}
      {count >= max ? " · เอาบางอันออกก่อนถ้าอยากเปลี่ยน" : ""}
    </p>
  );
}
