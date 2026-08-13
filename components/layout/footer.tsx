import Link from "next/link";
import { Globe2, MessageCircle, Send } from "lucide-react";
import { BrandGlyph } from "@/components/brand/brand-mark";
import { Logo } from "@/components/layout/logo";

const groups = [
  {
    title: "สำรวจ",
    links: [
      ["นิยายทั้งหมด", "/novels"],
      ["อัปเดตล่าสุด", "/updates"],
      ["อันดับ", "/rankings"],
      ["หมวดหมู่", "/genres"]
    ]
  },
  {
    title: "ช่วยเหลือ",
    links: [
      ["คำถามที่พบบ่อย", "/about"],
      ["ติดต่อเรา", "/about"],
      ["แจ้งปัญหา", "/notifications"]
    ]
  },
  {
    title: "เกี่ยวกับเรา",
    links: [
      ["เกี่ยวกับ NiyaiNow", "/about"],
      ["ข้อกำหนดการใช้งาน", "/terms"],
      ["นโยบายความเป็นส่วนตัว", "/privacy"]
    ]
  }
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/80 pb-24 pt-10 md:pb-10">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.4fr_2fr] lg:px-8">
        <div className="space-y-4">
          <Logo />
          <div className="grid max-w-sm gap-2">
            {[
              { icon: "fast" as const, title: "อัปเดตไว", text: "ตอนใหม่มาเร็ว ไม่พลาดทุกการติดตาม" },
              { icon: "read" as const, title: "อ่านง่าย สบายตา", text: "โหมดสีครอบคลุมทั้งเว็บและหน้าอ่าน" },
              { icon: "heart" as const, title: "ครบทุกแนวที่ชอบ", text: "เลือกต่อได้ไวจากคลังส่วนตัวของคุณ" }
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 rounded-lg border border-border bg-card/70 p-2.5">
                <BrandGlyph type={item.icon} />
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">นิยายใหม่ อัปเดตไว อ่านได้ทันที พร้อมคลังส่วนตัวสำหรับกลับมาอ่านต่อได้ไม่สะดุด</p>
          <div className="flex gap-2">
            {[Globe2, MessageCircle, Send].map((Icon, index) => (
              <Link key={index} href="/about" className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground" aria-label="social">
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-semibold">{group.title}</h3>
              <div className="grid gap-2">
                {group.links.map(([label, href]) => (
                  <Link key={href + label} className="text-sm text-muted-foreground hover:text-foreground" href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
