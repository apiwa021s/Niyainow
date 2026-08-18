import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Section heading capped at 32px tall (brief §5.9). */
export function SectionHeader({
  title,
  href,
  hrefLabel = "ดูทั้งหมด",
  trailing,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex min-h-8 items-center justify-between gap-3">
      <h2 className="min-w-0 truncate text-h2 font-semibold">{title}</h2>
      <div className="flex shrink-0 items-center gap-2">
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
        {trailing}
      </div>
    </div>
  );
}
