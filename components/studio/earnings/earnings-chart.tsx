"use client";

import { useId, useMemo, useState } from "react";

import { baht } from "@/components/studio/mock-data";
import type { EarningsDailyPoint } from "@/components/studio/mock-earnings";
import { StudioPanel } from "@/components/studio/studio-ui";
import { cn } from "@/lib/utils";

const RANGES = [
  { id: 7, label: "7 วัน" },
  { id: 30, label: "30 วัน" },
  { id: 90, label: "3 เดือน" },
] as const;

const CHART_WIDTH = 100;
const CHART_HEIGHT = 30;

/**
 * One chart, one metric — revenue only (spec §14). Default range is 30 days,
 * unlike the story performance chart's 7-day default, because a writer
 * checking earnings is usually thinking in "this month," not "today."
 */
export function EarningsChart({ daily }: { daily: readonly EarningsDailyPoint[] }) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const gradientId = useId();

  const series = useMemo(() => daily.slice(-range).map((point) => point.revenue), [daily, range]);

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

  const rangeLabel = RANGES.find((item) => item.id === range)?.label;

  return (
    <StudioPanel title="รายได้" description="แนวโน้มรายได้ในช่วงที่เลือก">
      <div className="grid gap-4 p-5">
        <div className="flex gap-1.5" role="tablist" aria-label="เลือกช่วงเวลา">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              onClick={() => setRange(item.id)}
              className={cn(
                "tap-target inline-flex h-9 items-center rounded-(--r-md) px-3 text-xs font-semibold transition-colors",
                range === item.id
                  ? "bg-[var(--brand-primary)] text-white"
                  : "border border-border text-(--text-secondary) hover:border-[var(--brand-emphasis)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="text-2xl font-semibold tabular-nums">
          {baht.format(total)} <span className="text-sm font-normal text-(--text-tertiary)">บาท รวม{rangeLabel}ล่าสุด</span>
        </p>

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-32 w-full text-brand-primary"
          role="img"
          aria-label={`กราฟรายได้ย้อนหลัง ${range} วัน`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} stroke="none" />
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </StudioPanel>
  );
}
