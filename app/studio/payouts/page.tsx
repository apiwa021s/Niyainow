import type { Metadata } from "next";
import { AlertTriangle, Building2, Download, FileText } from "lucide-react";

import { baht, studioPayouts, studioSummary, whole } from "@/components/studio/mock-data";
import { StatusPill, StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "การจ่ายเงิน" };

export default function StudioPayoutsPage() {
  return (
    <>
      <StudioPageHeader
        eyebrow="PAYOUTS"
        title="การจ่ายเงิน"
        description="ประวัติการโอนย้อนหลังทุกงวด พร้อมสลิปและหนังสือรับรองการหักภาษี ณ ที่จ่าย"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4">
          <section className="rounded-xl bg-accent-subtle p-5 sm:p-6">
            <p className="text-xs font-semibold text-[var(--brand-emphasis)]">ยอดรอโอนงวดถัดไป</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums">{baht.format(studioSummary.pendingBalance)}</p>
            <p className="mt-2 text-sm text-(--text-secondary)">
              กำหนดโอน {studioSummary.nextPayoutDate} · ยอดขั้นต่ำ {whole.format(studioSummary.minimumPayout)} บาท
              หากไม่ถึงจะทบไปงวดถัดไปโดยอัตโนมัติ
            </p>
          </section>

          <StudioPanel title="ประวัติการโอน">
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-(--text-tertiary)">
                    <th scope="col" className="px-5 py-3 font-medium">งวด</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">ก่อนหักภาษี</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">ภาษี 3%</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">ยอดโอนสุทธิ</th>
                    <th scope="col" className="px-5 py-3 font-medium">สถานะ</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">เอกสาร</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {studioPayouts.map((payout) => (
                    <tr key={payout.period} className="transition-colors duration-[var(--dur-fast)] hover:bg-muted/50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{payout.period}</p>
                        <p className="text-xs text-(--text-tertiary)">โอน {payout.paidAt}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{baht.format(payout.gross)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-(--text-secondary)">
                        {payout.tax === 0 ? "—" : `−${baht.format(payout.tax)}`}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{baht.format(payout.net)}</td>
                      <td className="px-5 py-3.5">
                        <StatusPill
                          label={payout.status}
                          dot={payout.status === "โอนแล้ว" ? "bg-emerald-500" : "bg-amber-500"}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex gap-3">
                          <button
                            type="button"
                            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
                          >
                            <FileText aria-hidden className="h-3.5 w-3.5" />
                            สลิป
                          </button>
                          <button
                            type="button"
                            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--text-secondary) underline-offset-4 hover:underline"
                          >
                            <Download aria-hidden className="h-3.5 w-3.5" />
                            CSV
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StudioPanel>
        </div>

        <div className="grid content-start gap-4">
          <StudioPanel title="บัญชีรับเงิน">
            <div className="p-5">
              <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <AlertTriangle aria-hidden className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs leading-6 text-(--text-secondary)">
                  ยังไม่ได้ยืนยันบัญชีธนาคาร เราจะโอนเงินให้ไม่ได้จนกว่าจะยืนยันเสร็จ ใช้เวลาตรวจสอบ 1–2 วันทำการ
                </p>
              </div>

              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs text-(--text-tertiary)">ธนาคาร</dt>
                  <dd className="mt-0.5 font-medium">ยังไม่ระบุ</dd>
                </div>
                <div>
                  <dt className="text-xs text-(--text-tertiary)">เลขที่บัญชี</dt>
                  <dd className="mt-0.5 font-medium">ยังไม่ระบุ</dd>
                </div>
                <div>
                  <dt className="text-xs text-(--text-tertiary)">ชื่อบัญชี</dt>
                  <dd className="mt-0.5 font-medium">ต้องตรงกับชื่อผู้รับเงินตามบัตรประชาชน</dd>
                </div>
              </dl>

              <Button type="button" variant="primary" className="mt-4 w-full">
                <Building2 aria-hidden className="h-4 w-4" />
                เพิ่มบัญชีธนาคาร
              </Button>
            </div>
          </StudioPanel>

          <StudioPanel title="เอกสารภาษี" description="หนังสือรับรองการหักภาษี ณ ที่จ่าย 3%">
            <ul className="divide-y divide-border text-sm">
              {["งวดกรกฎาคม 2569", "งวดมิถุนายน 2569", "สรุปประจำปี 2568"].map((doc) => (
                <li key={doc} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <span className="min-w-0 truncate text-(--text-secondary)">{doc}</span>
                  <button
                    type="button"
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
                  >
                    <Download aria-hidden className="h-3.5 w-3.5" />
                    ดาวน์โหลด
                  </button>
                </li>
              ))}
            </ul>
          </StudioPanel>
        </div>
      </div>
    </>
  );
}
