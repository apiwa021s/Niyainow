import Link from "next/link";

/** Quick links into the standard genre catalogue. */
const GENRE_CHIPS = [
  { label: "โรแมนติก", href: "/novels?genre=romance" },
  { label: "แฟนตาซี", href: "/novels?genre=fantasy" },
  { label: "แอ็กชัน", href: "/novels?genre=action" },
  { label: "ผจญภัย", href: "/novels?genre=adventure" },
  { label: "ลึกลับ", href: "/novels?genre=mystery" },
  { label: "ไซไฟ", href: "/novels?genre=sci-fi" },
  { label: "สยองขวัญ", href: "/novels?genre=horror" },
  { label: "ดราม่า", href: "/novels?genre=drama" },
  { label: "คอมเมดี้", href: "/novels?genre=comedy" },
  { label: "กีฬา", href: "/novels?genre=sports" },
  { label: "อ่านสบาย", href: "/novels?genre=slice-of-life" },
] as const;

export function GenreDiscovery() {
  return (
    <section aria-labelledby="genre-discovery-title" className="render-deferred">
      <p id="genre-discovery-title" className="text-sm font-semibold text-(--text-secondary)">
        วันนี้อยากอ่านแนวไหน?
      </p>
      <nav aria-label="เลือกแนวนิยาย" className="rail-scroll -mx-1 mt-2 flex gap-2 px-1">
        {GENRE_CHIPS.map((chip) => (
          <Link
            key={chip.label}
            href={chip.href}
            className="inline-flex h-10 shrink-0 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-(--text-secondary) transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)]"
          >
            {chip.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
