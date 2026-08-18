import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Section heading, capped at 32px tall (brief §5.9). The count sits in an
 * accent superscript pill so scanning down the page tells you how much is
 * behind each row before you decide to open it.
 */
export function SectionHeader({
  title,
  count,
  href,
  hrefLabel = "ดูทั้งหมด",
  trailing,
}: {
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex min-h-8 items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-start gap-1 text-h2 font-semibold">
        <span className="truncate">{title}</span>
        {typeof count === "number" && count > 0 ? (
          <span className="tabular mt-0.5 shrink-0 text-xs font-semibold text-accent-base">
            {count.toLocaleString("th-TH")}
          </span>
        ) : null}
      </h2>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        {href ? (
          /*
           * `py-3 -my-3` grows the hit area to 44px (§9) while the negative
           * margin keeps the row itself 32px tall (§5.9). Using min-h-11 here
           * instead would push the link out of the fixed-height row.
           */
          <Link
            href={href}
            className="-my-3 inline-flex min-h-11 items-center gap-0.5 py-3 text-sm font-semibold text-(--text-secondary) transition-colors hover:text-accent-base"
          >
            {hrefLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
