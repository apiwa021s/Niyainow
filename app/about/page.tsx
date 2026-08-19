import { ArrowRight, BadgeCheck, BookOpen, HeartHandshake, Languages, LogIn, Search, Sparkles } from "lucide-react";

import { InkHeroMark } from "@/components/about/ink-hero-mark";
import { InkUnderline } from "@/components/about/ink-underline";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "เกี่ยวกับ NovelNow",
  description: "NovelNow คือบ้านของนิยายแปลภาษาไทย ที่พานักแปลกับนักอ่านมาเจอกัน มารู้จักแนวคิดและตัวตนของเราให้มากขึ้น",
  path: "/about"
});

const roles = [
  {
    icon: BookOpen,
    title: "ถ้าคุณเป็นนักอ่าน",
    points: [
      "เจอนิยายแปลเรื่องใหม่ ๆ ได้ทุกแนว ทั้งเรื่องฮิตและตอนที่เพิ่งอัปเดต",
      "ติดตามนักแปลคนโปรดไว้ แล้วตามผลงานใหม่ของเขาได้ง่าย ๆ จากช่องค้นหา",
      "อ่านต่อจากตอนที่ค้างไว้ได้ทุกเครื่อง ไม่ต้องมานั่งไล่หาเอง"
    ]
  },
  {
    icon: Languages,
    title: "ถ้าคุณเป็นนักแปล",
    points: [
      "ชื่อคุณติดอยู่กับทุกตอนที่แปล ผู้อ่านเจอผลงานของคุณได้ตรง ๆ ไม่ต้องเดา",
      "ระบบเหรียญช่วยให้ผู้อ่านสนับสนุนตอนที่ปลดล็อกได้ตรงจุด แยกจากเนื้อหาฟรีชัดเจน",
      "ผลงานของคุณถูกจัดหมวดหมู่ไว้ดี ค้นหาเจอง่าย ไม่จมหายไปในฟีดที่ไหลเร็ว"
    ]
  }
] as const;

const principles = [
  { icon: Sparkles, title: "เนื้อหาคือพระเอก", body: "ทุกเลย์เอาต์และทุกสีต้องช่วยให้คุณเจอเรื่องที่ชอบและกลับมาอ่านต่อได้ง่าย ไม่ใช่มาแย่งความสนใจจากตัวนิยาย" },
  { icon: LogIn, title: "อ่านก่อน สมัครทีหลังก็ได้", body: "เนื้อหาส่วนใหญ่เปิดให้อ่านได้เลยไม่ต้องล็อกอิน จะผูกบัญชี Google ก็ต่อเมื่ออยากซิงก์ชั้นหนังสือ ประวัติ และความคืบหน้าข้ามเครื่อง" },
  { icon: BadgeCheck, title: "ชื่อนักแปลต้องเห็นชัดเสมอ", body: "ทุกตอนที่เผยแพร่มีชื่อผู้แปลติดไว้ ไม่มีทางถูกกลืนหายไปกับชื่อแพลตฟอร์มหรือฟีดที่ไหลเร็วจนมองไม่ทัน" },
  { icon: HeartHandshake, title: "ให้เกียรติทั้งคนอ่านและคนแปล", body: "ข้อมูลสำคัญ ๆ อย่างข้อกำหนด ความเป็นส่วนตัว หรือแนวทางลิขสิทธิ์ ต้องหาเจอง่าย ไม่ซ่อน ไม่อ้อมค้อม" }
] as const;

export default function AboutPage() {
  return (
    <PageShell className="max-w-6xl">
      <header className="grid items-center gap-8 py-4 sm:py-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12">
        <div className="min-w-0">
          <p className="editorial-kicker">ABOUT / NOVELNOW</p>
          <h1 className="mt-2 text-h1 font-semibold sm:text-display">ที่ที่นักแปลกับนักอ่านมาเจอกันง่าย ๆ</h1>
          <InkUnderline className="mt-1 max-w-56" />
          <p className="mt-4 max-w-2xl text-body text-(--text-secondary)">
            NovelNow คือบ้านของนิยายแปลภาษาไทย พาคุณเจอเรื่องใหม่ เจอนักแปลที่ถูกใจ แล้วอ่านต่อได้เรื่อย ๆ โดยไม่มีอะไรมากวนใจ
            พร้อมให้เครดิตคนแปลอย่างเต็มที่ทุกตอน
          </p>
        </div>
        <InkHeroMark className="mx-auto max-w-40 lg:max-w-none" />
      </header>

      <section aria-labelledby="roles-title" className="mt-8 sm:mt-12">
        <div className="max-w-3xl">
          <p className="editorial-kicker">READERS & TRANSLATORS</p>
          <h2 id="roles-title" className="mt-2 text-2xl font-semibold">ไม่ว่าคุณจะอ่านหรือแปล ที่นี่มีที่ให้คุณ</h2>
          <InkUnderline className="mt-1 max-w-44" variant="swoop" delay="0.05s" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.title} interactive className="rounded-xl p-6 sm:p-7">
                <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-accent-subtle text-brand-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{role.title}</h3>
                <ul className="mt-3 grid gap-2.5">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm leading-7 text-muted-foreground">
                      <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brand-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="principles-title" className="mt-10 sm:mt-14">
        <div className="max-w-3xl">
          <p className="editorial-kicker">OUR PRINCIPLES</p>
          <h2 id="principles-title" className="mt-2 text-2xl font-semibold">หลักที่เรายึดไว้</h2>
          <InkUnderline className="mt-1 max-w-32" variant="flick" delay="0.05s" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <div key={principle.title} className="flex gap-4 rounded-xl bg-card/70 p-5 sm:p-6">
                <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brand-primary/30 text-brand-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{principle.title}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{principle.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative mt-10 overflow-hidden rounded-xl bg-accent-subtle p-6 sm:mt-14 sm:p-8">
        <InkHeroMark className="pointer-events-none absolute -right-4 -top-4 max-w-28 opacity-[0.12] sm:max-w-36" />
        <div className="relative grid gap-4">
          <div>
            <h2 className="text-xl font-semibold">พร้อมเริ่มหรือยัง</h2>
            <InkUnderline className="mt-1 max-w-28" variant="wave" delay="0.05s" />
          </div>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            จะแวะมาอ่านเรื่องแรก หรือตามหานักแปลที่ติดตามอยู่ ก็เริ่มได้จากตรงนี้เลย
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/genres" variant="primary">
              ไปเลือกอ่านตามหมวดหมู่
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/search" variant="outline">
              <Search className="h-4 w-4" aria-hidden />
              ไปค้นหานักแปลที่ชอบ
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
