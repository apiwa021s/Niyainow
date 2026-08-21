import { baht, whole } from "@/components/studio/mock-data";
import type { ChapterEarnings } from "@/components/studio/mock-earnings";

const label = (chapter: ChapterEarnings) => `EP.${chapter.number}`;

/** Desktop table row (spec §17) — used inside a `<table>`, never on its own. */
export function ChapterEarningsRow({ chapter, onSelect }: { chapter: ChapterEarnings; onSelect: () => void }) {
  return (
    <tr
      onClick={onSelect}
      className="cursor-pointer transition-colors duration-[var(--dur-fast)] hover:bg-muted/50"
    >
      <td className="px-5 py-3.5">
        <span className="tabular-nums text-(--text-tertiary)">{label(chapter)}</span> {chapter.title}
      </td>
      <td className="px-5 py-3.5 tabular-nums text-(--text-secondary)">{chapter.priceCoins} Coins</td>
      <td className="px-5 py-3.5 text-right tabular-nums">{whole.format(chapter.unlocks)}</td>
      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{baht.format(chapter.creatorRevenue)}</td>
    </tr>
  );
}

/** Mobile card (spec §17 — mobile must never use a table). */
export function ChapterEarningsCard({ chapter, onSelect }: { chapter: ChapterEarnings; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors duration-[var(--dur-fast)] hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">
          <span className="tabular-nums text-(--text-tertiary)">{label(chapter)}</span> {chapter.title}
        </p>
        <p className="mt-1 text-xs text-(--text-tertiary) tabular-nums">
          {chapter.priceCoins} Coins · ปลดล็อก {whole.format(chapter.unlocks)} ครั้ง
        </p>
      </div>
      <p className="shrink-0 font-semibold tabular-nums">{baht.format(chapter.creatorRevenue)}</p>
    </button>
  );
}
