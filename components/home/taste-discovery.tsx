import Link from "next/link";
import { Flame } from "lucide-react";

/**
 * Signature "taste discovery" row (brief: "คืนนี้อยากอ่านแบบไหน?"). Each chip
 * is a plain link into /novels with the matching taxonomy filter pre-applied
 * — no client state needed, Discover reads the same query params.
 */
const TASTE_CHIPS = [
  { label: "โรแมนติก", href: "/novels?genre=romance", icon: false },
  { label: "ดาร์ก", href: "/novels?heat=4-5", icon: false },
  { label: "คลั่งรัก", href: "/novels?trope=possessive", icon: false },
  { label: "Omegaverse", href: "/novels?setting=omegaverse", icon: false },
  { label: "ต่างวัย", href: "/novels?trope=age_gap", icon: false },
  { label: "Slow Burn", href: "/novels?trope=slow_burn", icon: false },
  { label: "เข้มข้น", href: "/novels?heat=5", icon: true },
] as const;

export function TasteDiscovery() {
  return (
    <section aria-labelledby="taste-discovery-title" className="render-deferred">
      <p id="taste-discovery-title" className="text-sm font-semibold text-(--text-secondary)">
        คืนนี้อยากอ่านแบบไหน?
      </p>
      <nav aria-label="เลือกอารมณ์การอ่าน" className="rail-scroll -mx-1 mt-2 flex gap-2 px-1">
        {TASTE_CHIPS.map((chip) => (
          <Link
            key={chip.label}
            href={chip.href}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium text-(--text-secondary) transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)]"
          >
            {chip.icon ? <Flame className="h-3.5 w-3.5" aria-hidden /> : null}
            {chip.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
