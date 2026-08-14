"use client";

import { useState } from "react";
import { Panel } from "@/components/admin/admin-ui";
import { AreaTrend, ColumnChart } from "@/components/admin/charts";
import { cn } from "@/lib/utils";
import { dailyReaders, monthlyRevenue } from "@/data/admin-data";

const RANGES = [
  { value: "7d", label: "7 วันล่าสุด" },
  { value: "14d", label: "14 วันล่าสุด" },
  { value: "12m", label: "12 เดือนล่าสุด" }
];

/**
 * ตัวเลือกช่วงเวลาอยู่แถวเดียวเหนือกราฟทั้งหมด และมีผลกับทุกกราฟในบล็อกนี้พร้อมกัน
 * (ห้ามให้แต่ละกราฟมีตัวกรองของตัวเอง — ผู้อ่านจะเทียบตัวเลขข้ามกราฟไม่ได้)
 */
export function AnalyticsTrends() {
  const [range, setRange] = useState("14d");

  const readers = range === "7d" ? dailyReaders.slice(-7) : dailyReaders;
  const revenue = range === "12m" ? monthlyRevenue : monthlyRevenue.slice(range === "7d" ? -3 : -6);
  const revenueLabel = range === "12m" ? "12 เดือนล่าสุด" : range === "7d" ? "3 เดือนล่าสุด" : "6 เดือนล่าสุด";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="เลือกช่วงเวลา">
        {RANGES.map((item) => {
          const active = range === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              onClick={() => setRange(item.value)}
              className={cn(
                "h-10 rounded-[10px] border px-3 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="ผู้อ่านไม่ซ้ำต่อวัน" description={range === "7d" ? "7 วันล่าสุด" : "14 วันล่าสุด"}>
          <AreaTrend data={readers} unit="คน" numberFormat="compact" label="กราฟผู้อ่านไม่ซ้ำต่อวัน" />
        </Panel>

        <Panel title="รายได้จากการเติมเหรียญ" description={revenueLabel}>
          <ColumnChart data={revenue} unit="บาท" numberFormat="compact" label="กราฟรายได้จากการเติมเหรียญ" />
        </Panel>
      </div>
    </div>
  );
}
