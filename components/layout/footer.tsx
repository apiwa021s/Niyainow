import Link from "next/link";
import { Logo } from "@/components/layout/logo";

/** 4 คอลัมน์ตามส่วนที่ 6.13 — บนมือถือเป็น accordion ด้วย <details> (ไม่ต้องใช้ JS) */
const groups = [
  {
    title: "เกี่ยวกับ",
    links: [
      ["เกี่ยวกับเรา", "/about"],
      ["นิยายทั้งหมด", "/novels"],
      ["อันดับยอดนิยม", "/rankings"]
    ]
  },
  {
    title: "สำหรับผู้อ่าน",
    links: [
      ["วิธีใช้งาน", "/about"],
      ["ค้นหานิยาย", "/search"],
      ["ชั้นหนังสือ", "/library"],
      ["ประวัติการอ่าน", "/history"]
    ]
  },
  {
    title: "สำรวจ",
    links: [
      ["แนวนิยาย", "/genres"],
      ["แท็ก", "/tags"],
      ["อัปเดตล่าสุด", "/updates"]
    ]
  },
  {
    title: "กฎหมาย",
    links: [
      ["เงื่อนไขการใช้งาน", "/terms"],
      ["นโยบายความเป็นส่วนตัว", "/privacy"]
    ]
  }
];

export function Footer() {
  return (
    <footer className="mt-16 bg-[var(--brand-ink)] pb-24 text-[#EDE9F7] lg:pb-0">
      {/* เส้นบน gradient 2px (ส่วนที่ 6.13) */}
      <div aria-hidden className="h-0.5 w-full bg-[image:var(--grad-primary)]" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* desktop: 4 คอลัมน์ */}
        <div className="hidden gap-8 md:grid md:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-3 text-sm font-semibold">{group.title}</h2>
              <ul className="grid gap-2">
                {group.links.map(([label, href]) => (
                  <li key={href + label}>
                    <Link href={href} className="text-sm text-[#A79CC4] transition-colors hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* mobile: accordion */}
        <div className="md:hidden">
          {groups.map((group) => (
            <details key={group.title} className="border-b border-white/10">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold">
                {group.title}
                <span aria-hidden className="text-[#A79CC4]">
                  +
                </span>
              </summary>
              <ul className="grid gap-2 pb-4">
                {group.links.map(([label, href]) => (
                  <li key={href + label}>
                    <Link href={href} className="block py-1 text-sm text-[#A79CC4]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        {/* แถวล่าง */}
        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-[#A79CC4]">Your next chapter, right now.</p>
          </div>

          <p className="max-w-sm text-sm leading-6 text-[#A79CC4]">อ่านเนื้อหาสาธารณะได้ทันที และใช้ Google เพื่อซิงก์คลังกับความคืบหน้าระหว่างอุปกรณ์</p>
        </div>

        <p className="mt-6 text-xs text-[#A79CC4]">© {new Date().getFullYear()} NiyaiNow. สงวนลิขสิทธิ์ทุกประการ</p>
      </div>
    </footer>
  );
}
