import { baht } from "@/components/studio/mock-data";
import { CREATOR_EARNING_STATUS } from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

/**
 * The earnings hero (spec §12–13). "รายได้ของคุณ" is the current unpaid
 * balance — pending plus available — and "เดือนนี้" is how much of that
 * balance was earned in the current period. Deliberately plain: no gradient,
 * no glow, no animated counters (spec §44) — money reads as trustworthy when
 * it looks boring.
 */
export function EarningsBalanceCard({
  heroTotal,
  monthlyEarnings,
  monthlyEarningsChange,
  pendingAmount,
  availableAmount,
  lifetimeEarnings,
}: {
  heroTotal: number;
  monthlyEarnings: number;
  monthlyEarningsChange: number;
  pendingAmount: number;
  availableAmount: number;
  lifetimeEarnings: number;
}) {
  const pendingLabel = CREATOR_EARNING_STATUS.find((item) => item.id === "pending")?.nameTh ?? "กำลังตรวจสอบ";
  const availableLabel = CREATOR_EARNING_STATUS.find((item) => item.id === "available")?.nameTh ?? "พร้อมรับเงิน";
  const up = monthlyEarningsChange >= 0;

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-xs font-semibold text-[var(--brand-emphasis)]">รายได้ของคุณ</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums sm:text-5xl">{baht.format(heroTotal)}</p>
      <p className="mt-2 text-sm text-(--text-secondary)">
        เดือนนี้{" "}
        <span className={cn("font-semibold tabular-nums", up ? "text-emerald-500" : "text-destructive")}>
          {up ? "+" : "−"}
          {baht.format(Math.abs(monthlyEarnings))}
        </span>
      </p>

      <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-(--text-tertiary)">{pendingLabel}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{baht.format(pendingAmount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-(--text-tertiary)">{availableLabel}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {baht.format(availableAmount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-(--text-tertiary)">รายได้สะสม</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{baht.format(lifetimeEarnings)}</dd>
        </div>
      </dl>
    </section>
  );
}
