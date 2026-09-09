import Link from "next/link";

/**
 * Signature "taste discovery" row (brief: "คืนนี้อยากอ่านแบบไหน?"). Each chip
 * is a plain link into /novels with the matching taxonomy filter pre-applied
 * — no client state needed, Discover reads the same query params.
 */
const TASTE_CHIPS = [
  { label: "โรแมนติก", href: "/novels?genre=romance" },
  { label: "แฟนตาซี", href: "/novels?genre=fantasy" },
  { label: "แอ็กชัน", href: "/novels?genre=action" },
  { label: "ลึกลับ", href: "/novels?genre=mystery" },
  { label: "ไซไฟ", href: "/novels?genre=sci-fi" },
  { label: "สยองขวัญ", href: "/novels?genre=horror" },
  { label: "อ่านสบาย", href: "/novels?genre=slice-of-life" },
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
            {chip.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
