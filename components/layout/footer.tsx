import { cacheLife } from "next/cache";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";

const groups = [
  {
    title: "NiyaiThai",
    links: [
      ["เกี่ยวกับเรา", "/about"],
      ["นิยายทั้งหมด", "/novels"],
      ["อันดับยอดนิยม", "/rankings"]
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
      ["แนวนิยาย", "/genres"],
      ["แท็ก", "/tags"],
      ["อัปเดตล่าสุด", "/updates"]
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
    <footer className="mt-20 border-t border-[#2d2d34] bg-[#0e0e10] pb-28 text-[#f0ede9] lg:pb-0">
      <div aria-hidden className="mx-auto h-px max-w-[1440px] bg-[#2d2d34]">
        <span className="block h-px w-14 bg-[#b51f32]" />
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="hidden gap-8 md:grid md:grid-cols-4">
          {groups.map((group) => (
            <FooterGroup key={group.title} group={group} />
          ))}
        </div>

        <div className="md:hidden">
          {groups.map((group) => (
            <details key={group.title} className="border-b border-[#2d2d34]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold">
                {group.title}
                <span aria-hidden className="text-[#b8b4b0]">+</span>
              </summary>
              <ul className="grid gap-1 pb-4">
                {group.links.map(([label, href]) => (
                  <li key={href + label}>
                    <Link href={href} className="flex min-h-11 items-center text-sm text-[#b8b4b0] hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <div className="mt-10 grid gap-6 border-t border-[#2d2d34] pt-7 sm:grid-cols-[minmax(0,1fr)_minmax(260px,420px)] sm:items-end">
          <div>
            <Logo />
            <p className="mt-2 max-w-md text-sm leading-6 text-[#b8b4b0]">
              พื้นที่อ่านนิยายภาษาไทยที่ให้เนื้อหาเป็นพระเอก อ่านงานสาธารณะได้ทันที และเข้าสู่ระบบเมื่อต้องการซิงก์ความคืบหน้า
            </p>
          </div>
          <p className="border-l-2 border-[#b51f32] pl-4 text-sm leading-6 text-[#b8b4b0]">
            เราเคารพสิทธิ์ของผู้สร้างสรรค์ หากพบเนื้อหาที่อาจละเมิดลิขสิทธิ์ โปรดอ่านขั้นตอนและข้อมูลที่ต้องใช้ในหน้า{" "}
            <Link href="/copyright" className="font-semibold text-[#f0ede9] underline-offset-4 hover:underline">
              ลิขสิทธิ์และการแจ้งละเมิด
            </Link>
          </p>
        </div>

        <p className="mt-7 text-xs text-[#85817e]">© {copyrightYear} NiyaiThai. สงวนลิขสิทธิ์ทุกประการ</p>
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
            <Link href={href} className="inline-flex min-h-11 items-center text-sm text-[#b8b4b0] transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
