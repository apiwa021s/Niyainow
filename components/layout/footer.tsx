import { cacheLife } from "next/cache";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";

const groups = [
  {
    title: "NiyaiThai",
    links: [
      ["เกี่ยวกับเรา", "/about"],
      ["อ่านนิยายออนไลน์ทั้งหมด", "/novels"],
      ["อันดับนิยายยอดนิยม", "/rankings"]
    ]
  },
  {
    title: "สำหรับผู้อ่าน",
    links: [
      ["ค้นหานิยาย", "/search"],
      ["ชั้นหนังสือ", "/library"],
      ["ประวัติการอ่าน", "/history"]
    ]
  },
  {
    title: "สำรวจ",
    links: [
      ["หมวดหมู่นิยาย", "/genres"],
      ["แท็กนิยายยอดนิยม", "/tags"],
      ["นิยายอัปเดตล่าสุด", "/updates"]
    ]
  },
  {
    title: "ข้อมูลทางกฎหมาย",
    links: [
      ["ข้อกำหนดการใช้งาน", "/terms"],
      ["นโยบายความเป็นส่วนตัว", "/privacy"],
      ["ลิขสิทธิ์และการแจ้งละเมิด", "/copyright"]
    ]
  }
] as const;

async function getCopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer() {
  const copyrightYear = await getCopyrightYear();

  return (
    <footer className="mt-10 border-t border-border bg-surface text-(--text-primary)">
      <div className="mx-auto max-w-(--shell-max) px-3 py-6 sm:px-4 sm:py-8 lg:px-5">
        <div className="hidden gap-8 md:grid md:grid-cols-4">
          {groups.map((group) => (
            <FooterGroup key={group.title} group={group} />
          ))}
        </div>

        {/* Mobile collapses each group; four open lists would push the real
            page content a full screen further from the reader's thumb. */}
        <div className="md:hidden">
          {groups.map((group) => (
            <details key={group.title} className="border-b border-border">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {group.title}
                <span aria-hidden className="text-(--text-tertiary)">+</span>
              </summary>
              <ul className="grid gap-0.5 pb-3">
                {group.links.map(([label, href]) => (
                  <li key={href + label}>
                    <Link
                      href={href}
                      className="flex min-h-11 items-center text-sm text-(--text-secondary) hover:text-accent-base"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-[minmax(0,1fr)_minmax(260px,420px)] sm:items-end">
          <div>
            <Logo />
            <p className="mt-2 max-w-md text-sm leading-6 text-(--text-secondary)">
              พื้นที่อ่านนิยายภาษาไทยที่ให้เนื้อหาเป็นพระเอก อ่านงานสาธารณะได้ทันที และเข้าสู่ระบบเมื่อต้องการซิงก์ความคืบหน้า
            </p>
          </div>
          <p className="border-l-2 border-accent-base pl-4 text-sm leading-6 text-(--text-secondary)">
            เราเคารพสิทธิ์ของผู้สร้างสรรค์ หากพบเนื้อหาที่อาจละเมิดลิขสิทธิ์ โปรดอ่านขั้นตอนและข้อมูลที่ต้องใช้ในหน้า{" "}
            <Link href="/copyright" className="font-semibold text-(--text-primary) underline-offset-4 hover:underline">
              ลิขสิทธิ์และการแจ้งละเมิด
            </Link>
          </p>
        </div>

        <p className="mt-5 text-xs text-(--text-tertiary)">© {copyrightYear} NiyaiThai. สงวนลิขสิทธิ์ทุกประการ</p>
      </div>
    </footer>
  );
}

function FooterGroup({ group }: { group: (typeof groups)[number] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">{group.title}</h2>
      <ul className="grid gap-1">
        {group.links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="inline-flex min-h-11 items-center text-sm text-(--text-secondary) transition-colors hover:text-accent-base">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
