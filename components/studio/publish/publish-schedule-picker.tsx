import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

export type PublishTiming = "now" | "schedule";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function formatThaiDateTime(date: string, time: string) {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;
  const label = `${day} ${THAI_MONTHS[month - 1]} ${year + 543}`;
  return time ? `${label} เวลา ${time}` : label;
}

/** Now/schedule for a single chapter (spec §20) — GMT+7 stated plainly, no timezone guessing. */
export function PublishSchedulePicker({
  timing,
  date,
  time,
  onTimingChange,
  onDateChange,
  onTimeChange,
}: {
  timing: PublishTiming;
  date: string;
  time: string;
  onTimingChange: (timing: PublishTiming) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}) {
  const preview = timing === "schedule" ? formatThaiDateTime(date, time) : null;

  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold">จะเผยแพร่เมื่อไร?</p>
      <div className="grid gap-2">
        {(
          [
            { value: "now" as const, label: "ตอนนี้" },
            { value: "schedule" as const, label: "ตั้งเวลา" },
          ]
        ).map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-4",
              timing === option.value ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:border-[var(--brand-emphasis)]",
            )}
          >
            <input
              type="radio"
              name="chapter-timing"
              value={option.value}
              checked={timing === option.value}
              onChange={() => onTimingChange(option.value)}
              className="h-4.5 w-4.5 shrink-0 accent-[var(--brand-primary)]"
            />
            <span className="text-sm font-semibold">{option.label}</span>
          </label>
        ))}
      </div>

      {timing === "schedule" ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-(--text-secondary)">วันที่</span>
              <Input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-(--text-secondary)">เวลา (ไทย · GMT+7)</span>
              <Input type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} />
            </label>
          </div>
          {preview ? (
            <p className="rounded-(--r-md) bg-muted/50 p-3 text-sm leading-6 text-(--text-secondary)">
              ตอนนี้จะเผยแพร่ <span className="font-semibold text-(--text-primary)">{preview}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
