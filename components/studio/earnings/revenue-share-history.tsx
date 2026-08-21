import { contractTypeLabel, type CreatorRevenueContract } from "@/components/studio/mock-earnings";

/**
 * Contract version history (spec §21). Past periods keep the rate active
 * when their revenue was earned — this list is what makes that promise
 * checkable by the writer, not just asserted in copy.
 */
export function RevenueShareHistory({ history }: { history: readonly CreatorRevenueContract[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-(--text-secondary)">ประวัติส่วนแบ่งรายได้</p>
      <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
        {history.map((contract) => (
          <li key={contract.effectiveFromLabel} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">
                {contract.effectiveFromLabel} — {contract.effectiveToLabel ?? "ปัจจุบัน"}
              </p>
              <p className="mt-0.5 text-xs text-(--text-tertiary)">{contractTypeLabel(contract.type)}</p>
            </div>
            <p className="shrink-0 font-semibold tabular-nums">{contract.creatorSharePercent}%</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
