"use client";

import { useId, useMemo, useState } from "react";

import { baht, type DailyMetric, whole } from "@/components/studio/mock-data";
import { StudioPanel } from "@/components/studio/studio-ui";
import { cn } from "@/lib/utils";

const METRICS = [
  { id: "reads", label: "ยอดอ่าน" },
  { id: "unlocks", label: "ปลดล็อก" },
  { id: "revenue", label: "รายได้" },
] as const;

const RANGES = [
  { id: 7, label: "7 วัน" },
  { id: 30, label: "30 วัน" },
  { id: 90, label: "90 วัน" },
] as const;

type MetricId = (typeof METRICS)[number]["id"];

const CHART_WIDTH = 100;
const CHART_HEIGHT = 30;

/**
 * One chart, one metric at a time (spec §4 — never several charts stacked on
 * one page). A hand-rolled inline SVG polyline: this codebase never reaches
 * for a charting dependency, so a mini trend line doesn't start now.
 */
export function PerformanceChart({ daily }: { daily: readonly DailyMetric[] }) {
  const [metric, setMetric] = useState<MetricId>("reads");
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const gradientId = useId();

  const series = useMemo(() => daily.slice(-range).map((day) => day[metric]), [daily, metric, range]);

  const { points, area, total } = useMemo(() => {
    const max = Math.max(...series);
    const min = Math.min(...series);
    const spread = max - min || 1;
    const coords = series.map((value, index) => {
      const x = series.length > 1 ? (index / (series.length - 1)) * CHART_WIDTH : 0;
      const y = CHART_HEIGHT - ((value - min) / spread) * CHART_HEIGHT;
      return [x, y] as const;
    });
    const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
    const areaPath = `M${coords[0]?.[0] ?? 0},${CHART_HEIGHT} L${line} L${coords[coords.length - 1]?.[0] ?? 0},${CHART_HEIGHT} Z`;
    return { points: line, area: areaPath, total: series.reduce((sum, value) => sum + value, 0) };
  }, [series]);

  const format = metric === "revenue" ? baht.format : whole.format;
  const unit = metric === "revenue" ? "บาท" : "ครั้ง";

  return (
    <StudioPanel title="ผลงานในช่วง 7 วัน" description="ดูแนวโน้มล่าสุด สลับตัวชี้วัดและช่วงเวลาได้ด้านล่าง">
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="เลือกตัวชี้วัด">
            {METRICS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={metric === item.id}
                onClick={() => setMetric(item.id)}
                className={cn(
                  "tap-target inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold transition-colors",
                  metric === item.id
                    ? "bg-[var(--brand-primary)] text-white"
                    : "border border-border text-(--text-secondary) hover:border-[var(--brand-emphasis)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5" role="tablist" aria-label="เลือกช่วงเวลา">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                onClick={() => setRange(item.id)}
                className={cn(
                  "tap-target inline-flex h-9 items-center rounded-(--r-md) px-2.5 text-xs font-medium transition-colors",
                  range === item.id ? "bg-muted text-(--text-primary)" : "text-(--text-tertiary) hover:text-(--text-secondary)",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-2xl font-semibold tabular-nums">
          {format(total)} <span className="text-sm font-normal text-(--text-tertiary)">{unit} รวม{RANGES.find((r) => r.id === range)?.label}ล่าสุด</span>
        </p>

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-32 w-full text-brand-primary"
          role="img"
          aria-label={`กราฟ${METRICS.find((m) => m.id === metric)?.label}ย้อนหลัง ${range} วัน`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} stroke="none" />
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </StudioPanel>
  );
}
