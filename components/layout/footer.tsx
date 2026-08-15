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
      ["นโยบายความเป็นส่วนตัว", "/privacy"],
      ["ลิขสิทธิ์และการแจ้งละเมิด", "/copyright"]
    ]
  }
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[#292929] bg-[#0a0a0a] pb-24 text-[#f5f3ef] lg:pb-0">
      <div aria-hidden className="mx-auto h-px max-w-[1440px] bg-[linear-gradient(90deg,#c91820_0_64px,#292929_64px)]" />

      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        {/* desktop: 4 คอลัมน์ */}
        <div className="hidden gap-8 md:grid md:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-3 text-sm font-semibold">{group.title}</h2>
              <ul className="grid gap-2">
                {group.links.map(([label, href]) => (
                  <li key={href + label}>
                    <Link href={href} className="text-sm text-[#b4b0aa] transition-colors hover:text-white">
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
                <span aria-hidden className="text-[#b4b0aa]">
                  +
                </span>
              </summary>
              <ul className="grid gap-2 pb-4">
                {group.links.map(([label, href]) => (
                  <li key={href + label}>
                    <Link href={href} className="block py-1 text-sm text-[#b4b0aa]">
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
            <p className="mt-2 text-sm text-[#b4b0aa]">静かに読む · Read in quiet.</p>
          </div>

          <div className="flex max-w-sm items-start gap-4">
            <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center border border-[#c91820] text-xs font-semibold text-[#e02028]">読<br />書</span>
            <p className="text-sm leading-6 text-[#b4b0aa]">อ่านเนื้อหาสาธารณะได้ทันที และใช้ Google เพื่อซิงก์ชั้นหนังสือกับความคืบหน้าระหว่างอุปกรณ์</p>
          </div>
        </div>

        {/* ประกาศถาวร — แถบแจ้งเตือนปิดได้ ประกาศนี้จึงต้องอยู่ให้เห็นเสมอ */}
        <p className="mt-6 max-w-3xl text-xs leading-6 text-[#8f8b86]">
          NiyaiThai ไม่เผยแพร่งานที่ยังมีลิขสิทธิ์ในประเทศไทย หากพบเนื้อหาที่ละเมิดสิทธิ์ของคุณ{" "}
          <Link href="/copyright" className="font-semibold text-white underline-offset-4 hover:underline">
            แจ้งเราได้ที่นี่
          </Link>{" "}
          ทีมงานจะตรวจสอบและนำออกโดยเร็วที่สุด
          <span lang="en" className="mt-1 block">
            This site does not publish works still under copyright in Thailand. Rights holders can report
            infringing content for prompt review and removal.
          </span>
        </p>

        <p className="mt-4 text-xs text-[#77736f]">© {new Date().getFullYear()} NiyaiThai. สงวนลิขสิทธิ์ทุกประการ</p>
      </div>
    </footer>
  );
}
