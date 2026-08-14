"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Input, Select } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

/* =========================================================================
   ตารางข้อมูลหลังบ้าน (ใช้ซ้ำทุกหน้า)
   - เลือกหลายแถว + แถบ bulk action
   - แบ่งหน้าฝั่ง client (ข้อมูลเป็น mock ทั้งชุดอยู่แล้ว)
   - บนจอแคบเลื่อนแนวนอนภายในกล่อง ตัวหน้าเว็บต้องไม่เลื่อนตาม
   ========================================================================= */

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headClassName?: string;
  /** ซ่อนคอลัมน์รองบนจอเล็ก เพื่อให้คอลัมน์หลักยังอ่านได้ */
  hideBelow?: "sm" | "md" | "lg" | "xl";
};

export type BulkAction = {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "danger";
  onRun: (ids: string[]) => void;
};

const HIDE_CLASS: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell"
};

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  caption,
  selectable = false,
  bulkActions = [],
  pageSize = 12,
  empty
}: {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  /** คำอธิบายตารางสำหรับ screen reader */
  caption: string;
  selectable?: boolean;
  bulkActions?: BulkAction[];
  pageSize?: number;
  empty?: ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const headCheckbox = useRef<HTMLInputElement>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  // ผลลัพธ์เปลี่ยน (กรอง/ค้นหาใหม่) → กลับไปหน้าแรกและล้างการเลือกที่ค้างอยู่
  const rowsKey = `${rows.length}:${rows.slice(0, 3).map(getRowKey).join("|")}`;
  const [lastRowsKey, setLastRowsKey] = useState(rowsKey);
  if (rowsKey !== lastRowsKey) {
    setLastRowsKey(rowsKey);
    setPage(1);
    setSelected([]);
  }

  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = useMemo(() => rows.slice(start, start + pageSize), [rows, start, pageSize]);

  const visibleKeys = visible.map(getRowKey);
  const allSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selected.includes(key));
  const someSelected = visibleKeys.some((key) => selected.includes(key));

  useEffect(() => {
    if (headCheckbox.current) headCheckbox.current.indeterminate = !allSelected && someSelected;
  }, [allSelected, someSelected]);

  const toggleAll = () =>
    setSelected((current) =>
      allSelected ? current.filter((key) => !visibleKeys.includes(key)) : [...new Set([...current, ...visibleKeys])]
    );

  const toggleRow = (key: string) =>
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

  return (
    <div className="flex flex-col gap-3">
      {/* แถบ bulk action — โผล่เมื่อเลือกอย่างน้อยหนึ่งแถว */}
      {selectable && selected.length > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/8 px-3 py-2"
        >
          <span className="tabular text-sm font-semibold">เลือกไว้ {selected.length.toLocaleString("th-TH")} รายการ</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {bulkActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  action.onRun(selected);
                  setSelected([]);
                }}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-[8px] border px-3 text-xs font-semibold transition-colors",
                  action.tone === "danger"
                    ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected([])}
              className="inline-flex h-9 items-center gap-1 rounded-[8px] px-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              ยกเลิกการเลือก
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[16px] border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left">
                {selectable ? (
                  <th scope="col" className="w-10 px-3 py-3">
                    <input
                      ref={headCheckbox}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="เลือกทุกแถวในหน้านี้"
                      className="h-4 w-4 accent-[var(--brand-primary)]"
                    />
                  </th>
                ) : null}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-3 py-3 text-xs font-semibold text-muted-foreground",
                      column.hideBelow && HIDE_CLASS[column.hideBelow],
                      column.headClassName
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12">
                    {empty ?? <p className="text-center text-sm text-muted-foreground">ไม่มีข้อมูลที่ตรงกับตัวกรองนี้</p>}
                  </td>
                </tr>
              ) : (
                visible.map((row) => {
                  const key = getRowKey(row);
                  const checked = selected.includes(key);
                  return (
                    <tr
                      key={key}
                      className={cn(
                        "border-b border-border/70 last:border-0 transition-colors hover:bg-muted/50",
                        checked && "bg-[var(--brand-primary)]/6"
                      )}
                    >
                      {selectable ? (
                        <td className="px-3 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRow(key)}
                            aria-label={`เลือกแถว ${key}`}
                            className="h-4 w-4 accent-[var(--brand-primary)]"
                          />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "px-3 py-3 align-middle",
                            column.hideBelow && HIDE_CLASS[column.hideBelow],
                            column.className
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {rows.length > pageSize ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5">
            <p className="tabular text-xs text-muted-foreground">
              แสดง {(start + 1).toLocaleString("th-TH")}–{Math.min(start + pageSize, rows.length).toLocaleString("th-TH")} จาก{" "}
              {rows.length.toLocaleString("th-TH")} รายการ
            </p>
            <div className="flex items-center gap-1">
              <PagerButton label="หน้าก่อนหน้า" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </PagerButton>
              <span className="tabular px-2 text-xs font-semibold">
                {currentPage} / {totalPages}
              </span>
              <PagerButton label="หน้าถัดไป" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </PagerButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PagerButton({
  children,
  label,
  disabled,
  onClick
}: {
  children: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-[8px] border border-border bg-card text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ ตัวกรอง */

export type FilterConfig = {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

/**
 * แถวค้นหา + ตัวกรอง ด้านบนของทุกตาราง
 * ปุ่ม "ล้างตัวกรอง" จะโผล่เมื่อมีอะไรถูกเลือกอยู่จริงเท่านั้น
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "ค้นหา…",
  filters = [],
  onReset,
  resultLabel,
  actions
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onReset?: () => void;
  resultLabel?: string;
  actions?: ReactNode;
}) {
  const dirty = Boolean(search) || filters.some((filter) => filter.value && filter.value !== "all");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        {onSearchChange ? (
          <div className="relative min-w-0 flex-1 basis-56">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search ?? ""}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-10 pl-9"
            />
          </div>
        ) : null}

        {filters.map((filter) => (
          <label key={filter.key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">{filter.label}</span>
            <Select
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
              className="h-10 w-auto min-w-32 text-sm"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        ))}

        {actions ? <div className="ml-auto flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {resultLabel ? <p className="tabular text-xs text-muted-foreground">{resultLabel}</p> : null}
        {dirty && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-[var(--brand-light-on-light)] hover:underline"
          >
            ล้างตัวกรอง
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** ตัวเลือก "ทั้งหมด" + รายการที่เหลือ — ทุกตัวกรองใช้รูปแบบเดียวกัน */
export function allOption(options: { value: string; label: string }[], allLabel = "ทั้งหมด") {
  return [{ value: "all", label: allLabel }, ...options];
}
