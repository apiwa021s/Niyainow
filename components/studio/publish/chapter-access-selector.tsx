import { CHAPTER_PRICES } from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

export type ChapterAccess = "free" | "paid";

/**
 * Free/paid + the coin price grid (spec §17). The "usual price" hint reads
 * off the story's own pricing default (components/studio/settings) so a
 * writer publishing their 400th chapter never has to re-decide a price
 * they've already settled on.
 */
export function ChapterAccessSelector({
  access,
  price,
  usualPrice,
  onAccessChange,
  onPriceChange,
}: {
  access: ChapterAccess;
  price: number;
  usualPrice: number;
  onAccessChange: (access: ChapterAccess) => void;
  onPriceChange: (price: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold">ใครอ่านตอนนี้ได้?</p>
      <div className="grid gap-2">
        {(
          [
            { value: "free" as const, label: "อ่านฟรี", hint: "ทุกคนเปิดอ่านได้ทันที" },
            { value: "paid" as const, label: "ใช้ Coins", hint: "ผู้อ่านต้องปลดล็อกด้วยเหรียญก่อนอ่าน" },
          ]
        ).map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer gap-3 rounded-xl border p-4",
              access === option.value ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:border-[var(--brand-emphasis)]",
            )}
          >
            <input
              type="radio"
              name="chapter-access"
              value={option.value}
              checked={access === option.value}
              onChange={() => onAccessChange(option.value)}
              className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-[var(--brand-primary)]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-6 text-(--text-secondary)">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {access === "paid" ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-(--text-secondary)">ราคาตอน</p>
          <div className="flex flex-wrap gap-2">
            {CHAPTER_PRICES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={price === value}
                onClick={() => onPriceChange(value)}
                className={cn(
                  "tap-target inline-flex h-11 min-w-11 items-center justify-center rounded-(--r-md) border px-3 text-sm font-semibold",
                  price === value
                    ? "border-transparent bg-[var(--brand-primary)] text-white"
                    : "border-border text-(--text-secondary) hover:border-[var(--brand-emphasis)]",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          {usualPrice ? (
            <p className="text-xs text-(--text-tertiary)">ราคาที่ใช้เป็นประจำ · {usualPrice} Coins</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
