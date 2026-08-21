import type { Metadata } from "next";
import { Coins, Download, Info, Unlock, Wallet } from "lucide-react";

import { baht, studioEarningsByWork, studioSummary, whole } from "@/components/studio/mock-data";
import { StatTile, StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "รายได้" };

const recentUnlocks = [
  { at: "21/08 09:14", chapter: "เกิดใหม่เป็นลิโป้ · ตอนที่ 2666", price: 5, kind: "เติมเงิน", amount: 3.5 },
  { at: "21/08 09:31", chapter: "เกิดใหม่เป็นลิโป้ · ตอนที่ 2665", price: 5, kind: "เติมเงิน", amount: 3.5 },
  { at: "21/08 10:02", chapter: "ปรุงโอสถสวรรค์ · ตอนที่ 401", price: 5, kind: "แจกฟรี", amount: 3.5 },
  { at: "21/08 10:20", chapter: "เกิดใหม่เป็นลิโป้ · ตอนที่ 2664", price: 5, kind: "เติมเงิน", amount: 3.5 },
  { at: "21/08 11:07", chapter: "ระบบนอบชีวิตตอนต่อไป · ตอนที่ 24", price: 3, kind: "เติมเงิน", amount: 2.1 },
] as const;

export default function StudioEarningsPage() {
  return (
    <>
      <StudioPageHeader
        eyebrow={`งวดปัจจุบัน · ${studioSummary.currentPeriod}`}
        title="รายได้"
        description="ทุกตัวเลขคิดจากราคาป้าย × 70% เสมอ ไม่ว่าผู้อ่านจะจ่ายจริงเท่าไร ดาวน์โหลด CSV ไปบวกเองแล้วต้องตรงกันทุกสตางค์"
        action={
          <Button type="button" variant="outline">
            <Download aria-hidden className="h-4 w-4" />
            ดาวน์โหลด CSV งวดนี้
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Coins}
          label="รายได้งวดนี้ (ก่อนหักภาษี)"
          value={baht.format(studioSummary.earnings)}
          unit="บาท"
          change={studioSummary.earningsChange}
        />
        <StatTile
          icon={Unlock}
          label="การปลดล็อกงวดนี้"
          value={whole.format(studioSummary.unlocks)}
          unit="ครั้ง"
          change={studioSummary.unlocksChange}
        />
        <StatTile
          icon={Wallet}
          label="คาดว่าจะได้รับสุทธิ"
          value={baht.format(studioSummary.earnings * 0.97)}
          unit="บาท"
          hint="หลังหักภาษี ณ ที่จ่าย 3% ยอดจริงล็อกเมื่อปิดงวด"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <StudioPanel title="รายได้แยกตามเรื่อง" description="งวดปัจจุบัน">
          <ul className="divide-y divide-border">
            {studioEarningsByWork.map((row) => (
              <li key={row.title} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{row.title}</p>
                  <p className="shrink-0 font-semibold tabular-nums">{baht.format(row.gross)} บาท</p>
                </div>
                <p className="mt-1 text-xs text-(--text-tertiary) tabular-nums">
                  ปลดล็อก {whole.format(row.unlocks)} ครั้ง · คิดเป็น {row.share}% ของรายได้งวดนี้
                </p>
                <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand-primary" style={{ width: `${row.share}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </StudioPanel>

        <section className="rounded-xl bg-accent-subtle p-5">
          <p className="text-xs font-semibold text-[var(--brand-emphasis)]">รอบการจ่ายเงิน</p>
          <ul className="mt-3 grid gap-2.5 text-sm text-(--text-secondary)">
            <li>ปิดงวด วันสุดท้ายของเดือน 23:59 น.</li>
            <li>สรุปยอด ภายในวันที่ 7 ของเดือนถัดไป</li>
            <li>โอนเงิน ภายในวันที่ 15 ของเดือนถัดไป</li>
            <li>ยอดขั้นต่ำ {whole.format(studioSummary.minimumPayout)} บาท ไม่ถึงจะทบให้อัตโนมัติ</li>
          </ul>
          <ButtonLink href="/creators" variant="outline" className="mt-4 w-full">
            อ่านเงื่อนไขส่วนแบ่งฉบับเต็ม
          </ButtonLink>
        </section>
      </div>

      <StudioPanel
        className="mt-4"
        title="รายการปลดล็อกล่าสุด"
        description="หนึ่งบรรทัดคือหนึ่งครั้งที่มีคนกดปลดล็อกตอนของคุณ"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-(--text-tertiary)">
                <th scope="col" className="px-5 py-3 font-medium">วันเวลา</th>
                <th scope="col" className="px-5 py-3 font-medium">ตอน</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">ราคาป้าย</th>
                <th scope="col" className="px-5 py-3 font-medium">ประเภทเหรียญ</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">ยอดของคุณ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentUnlocks.map((row) => (
                <tr key={`${row.at}-${row.chapter}`} className="transition-colors duration-[var(--dur-fast)] hover:bg-muted/50">
                  <td className="px-5 py-3.5 tabular-nums text-(--text-secondary)">{row.at}</td>
                  <td className="px-5 py-3.5">{row.chapter}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{row.price}</td>
                  <td className="px-5 py-3.5 text-(--text-secondary)">{row.kind}</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{baht.format(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex gap-2 border-t border-border px-5 py-4 text-xs leading-6 text-(--text-tertiary)">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          รายการที่บันทึกแล้วจะไม่ถูกแก้ไขหรือลบ หากมีการคืนเงิน ระบบจะเพิ่มรายการยอดติดลบให้เห็นชัดแทน
        </p>
      </StudioPanel>
    </>
  );
}
