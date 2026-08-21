import type { CreatorTransaction } from "@/components/studio/mock-earnings";
import { baht } from "@/components/studio/mock-data";
import { StatusPill } from "@/components/studio/studio-ui";
import { CREATOR_EARNING_STATUS, CREATOR_TRANSACTION_TYPES } from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<CreatorTransaction["status"], string> = {
  pending: "bg-amber-500",
  available: "bg-emerald-500",
  reversed: "bg-(--text-tertiary)",
};

/** One line per ledger movement (spec §24). Never edited in place — only new rows ever get added. */
export function CreatorTransactionRow({ tx }: { tx: CreatorTransaction }) {
  const typeLabel = CREATOR_TRANSACTION_TYPES.find((item) => item.id === tx.type)?.nameTh ?? tx.type;
  const statusLabel = CREATOR_EARNING_STATUS.find((item) => item.id === tx.status)?.nameTh ?? tx.status;
  const positive = tx.amount >= 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs text-(--text-tertiary) tabular-nums">{tx.atLabel}</p>
        {tx.chapterLabel ? (
          <p className="mt-1 truncate font-medium">{tx.chapterLabel}</p>
        ) : tx.storyTitle ? (
          <p className="mt-1 truncate font-medium">{tx.storyTitle}</p>
        ) : null}
        <p className="mt-1 text-xs text-(--text-secondary)">{typeLabel}</p>
        {tx.description ? <p className="mt-1 max-w-md text-xs leading-5 text-(--text-tertiary)">{tx.description}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("font-semibold tabular-nums", positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {positive ? "+" : "−"}
          {baht.format(Math.abs(tx.amount))}
        </p>
        <div className="mt-1 flex justify-end">
          <StatusPill label={statusLabel} dot={STATUS_DOT[tx.status]} />
        </div>
      </div>
    </div>
  );
}
