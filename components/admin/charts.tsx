"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SeriesPoint } from "@/types/admin";
import { cn, formatNumber } from "@/lib/utils";

/* =========================================================================
   กราฟหลังบ้าน — SVG ล้วน ไม่มีไลบรารีภายนอก
   กติกาที่ยึดทั้งไฟล์:
   - หนึ่งกราฟ = หนึ่งชุดข้อมูล = หนึ่งสี (สีไม่ได้แปลว่าค่ามาก/น้อย ความยาวแท่งบอกอยู่แล้ว)
   - เส้นกริดเป็นเส้นบาง 1px สีจาง ห้ามเส้นประ
   - ป้ายค่ากำกับเฉพาะจุดสำคัญ ไม่ใส่ทุกจุด
   - ทุกกราฟมี "ดูเป็นตาราง" เสมอ — tooltip เป็นของเสริม ไม่ใช่ทางเดียวที่จะอ่านค่าได้
   ========================================================================= */

/** สีข้อมูล: โทเคนนี้สลับค่าตามธีมอยู่แล้ว (ม่วงเข้มบนพื้นสว่าง / ม่วงสดบนพื้นมืด) */
const ACCENT = "var(--brand-light-on-light)";
const GRID = "var(--border-color)";
const SURFACE = "var(--card)";
const AXIS_TEXT = "var(--text-tertiary)";

/**
 * รูปแบบตัวเลขบนแกนและ tooltip
 * ส่งเป็น "ตัวเลือก" ไม่ใช่ฟังก์ชัน เพราะหน้าที่เรียกส่วนใหญ่เป็น server component
 * ซึ่งส่งฟังก์ชันข้ามไป client component ไม่ได้
 */
export type NumberFormat = "full" | "compact";

const formatBy = (format: NumberFormat) => (value: number) =>
  format === "compact" ? formatNumber(value) : value.toLocaleString("th-TH");

/** ปัดเพดานแกน Y ขึ้นเป็นเลขกลม ๆ เพื่อให้ tick อ่านง่าย */
function niceMax(max: number) {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / (magnitude / 2)) * (magnitude / 2);
}

/** วัดความกว้างจริงของกล่อง เพื่อให้ตัวอักษรในกราฟไม่ถูกย่อจนอ่านไม่ออกบนมือถือ */
function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/** กรอบกราฟ + ตารางค่า (ตัวสำรองที่อ่านได้ด้วย screen reader และตอนพิมพ์) */
function ChartFrame({
  data,
  unit,
  format,
  children
}: {
  data: SeriesPoint[];
  unit?: string;
  format: (value: number) => string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {children}
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <span className="transition-transform group-open:rotate-90" aria-hidden>
            ›
          </span>
          ดูเป็นตาราง
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-[8px] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left">
                <th scope="col" className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                  ช่วง
                </th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                  ค่า{unit ? ` (${unit})` : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.label} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-1.5">{point.label}</td>
                  <td className="tabular px-3 py-1.5 text-right">{format(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Tooltip({ x, label, value }: { x: number; label: string; value: string }) {
  return (
    <div
      role="status"
      style={{ left: x }}
      className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-border bg-popover px-2.5 py-1.5 text-xs shadow-[var(--sh-2)]"
    >
      <span className="block font-semibold">{label}</span>
      <span className="tabular block text-muted-foreground">{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------- กราฟเส้น/พื้นที่ */

export function AreaTrend({
  data,
  height = 260,
  unit,
  numberFormat = "full",
  label
}: {
  data: SeriesPoint[];
  height?: number;
  unit?: string;
  numberFormat?: NumberFormat;
  /** คำอธิบายกราฟสำหรับ screen reader */
  label: string;
}) {
  const { ref, width } = useMeasuredWidth();
  const [active, setActive] = useState<number | null>(null);
  const format = formatBy(numberFormat);

  const padding = { top: 18, right: 18, bottom: 26, left: 52 };
  const plotWidth = Math.max(0, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;
  const max = niceMax(Math.max(...data.map((point) => point.value)));

  const xAt = (index: number) => padding.left + (plotWidth * index) / Math.max(1, data.length - 1);
  const yAt = (value: number) => padding.top + plotHeight - (value / max) * plotHeight;

  const linePath = data.map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(point.value)}`).join(" ");
  const areaPath = `${linePath} L${xAt(data.length - 1)},${padding.top + plotHeight} L${xAt(0)},${padding.top + plotHeight} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => max * ratio);
  // แสดงป้ายแกน X ไม่เกิน 7 อัน กันตัวอักษรชนกันบนจอแคบ
  const labelStep = Math.max(1, Math.ceil(data.length / (width < 480 ? 4 : 7)));
  const activePoint = active === null ? null : data[active];

  function pointerIndex(clientX: number) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || plotWidth <= 0) return null;
    const ratio = (clientX - box.left - padding.left) / plotWidth;
    return Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1))));
  }

  return (
    <ChartFrame data={data} unit={unit} format={format}>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 ? (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={label}
              tabIndex={0}
              onPointerMove={(event) => setActive(pointerIndex(event.clientX))}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(data.length - 1)}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                setActive((current) => {
                  const next = (current ?? data.length - 1) + (event.key === "ArrowRight" ? 1 : -1);
                  return Math.max(0, Math.min(data.length - 1, next));
                });
              }}
              className="touch-pan-y outline-offset-2"
            >
              {ticks.map((tick) => (
                <g key={tick}>
                  <line x1={padding.left} x2={width - padding.right} y1={yAt(tick)} y2={yAt(tick)} stroke={GRID} strokeWidth={1} />
                  <text x={padding.left - 8} y={yAt(tick) + 4} textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular">
                    {format(Math.round(tick))}
                  </text>
                </g>
              ))}

              <path d={areaPath} fill={ACCENT} opacity={0.1} />
              <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

              {data.map((point, index) =>
                index % labelStep === 0 || index === data.length - 1 ? (
                  <text key={point.label} x={xAt(index)} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                    {point.label}
                  </text>
                ) : null
              )}

              {active !== null && activePoint ? (
                <g>
                  <line
                    x1={xAt(active)}
                    x2={xAt(active)}
                    y1={padding.top}
                    y2={padding.top + plotHeight}
                    stroke={GRID}
                    strokeWidth={1}
                  />
                  <circle cx={xAt(active)} cy={yAt(activePoint.value)} r={5} fill={ACCENT} stroke={SURFACE} strokeWidth={2} />
                </g>
              ) : null}

              {/* จุดปลายเส้น + ป้ายค่าล่าสุด — ป้ายเดียวในกราฟ ไม่ใส่ทุกจุด */}
              <circle
                cx={xAt(data.length - 1)}
                cy={yAt(data[data.length - 1].value)}
                r={4}
                fill={ACCENT}
                stroke={SURFACE}
                strokeWidth={2}
              />
            </svg>

            {active !== null && activePoint ? (
              <Tooltip
                x={Math.min(Math.max(xAt(active), 60), width - 60)}
                label={activePoint.label}
                value={`${format(activePoint.value)}${unit ? ` ${unit}` : ""}`}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </ChartFrame>
  );
}

/* -------------------------------------------------------------- กราฟแท่งตั้ง */

export function ColumnChart({
  data,
  height = 260,
  unit,
  numberFormat = "full",
  label
}: {
  data: SeriesPoint[];
  height?: number;
  unit?: string;
  numberFormat?: NumberFormat;
  label: string;
}) {
  const { ref, width } = useMeasuredWidth();
  const [active, setActive] = useState<number | null>(null);
  const format = formatBy(numberFormat);

  const padding = { top: 18, right: 12, bottom: 26, left: 52 };
  const plotWidth = Math.max(0, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;
  const max = niceMax(Math.max(...data.map((point) => point.value)));
  const baseline = padding.top + plotHeight;

  const band = plotWidth / Math.max(1, data.length);
  const barWidth = Math.min(24, band * 0.56);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => max * ratio);
  const labelStep = Math.max(1, Math.ceil(data.length / (width < 480 ? 4 : 8)));

  /** แท่งมนเฉพาะปลายด้านบน 4px ส่วนที่ติดเส้นฐานเป็นมุมฉาก */
  function barPath(x: number, y: number, w: number, h: number) {
    const r = Math.min(4, h, w / 2);
    return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
  }

  return (
    <ChartFrame data={data} unit={unit} format={format}>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 ? (
          <>
            <svg width={width} height={height} role="img" aria-label={label} onPointerLeave={() => setActive(null)}>
              {ticks.map((tick) => (
                <g key={tick}>
                  <line x1={padding.left} x2={width - padding.right} y1={baseline - (tick / max) * plotHeight} y2={baseline - (tick / max) * plotHeight} stroke={GRID} strokeWidth={1} />
                  <text
                    x={padding.left - 8}
                    y={baseline - (tick / max) * plotHeight + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill={AXIS_TEXT}
                    className="tabular"
                  >
                    {format(Math.round(tick))}
                  </text>
                </g>
              ))}

              {data.map((point, index) => {
                const barHeight = (point.value / max) * plotHeight;
                const x = padding.left + band * index + (band - barWidth) / 2;
                return (
                  <g key={point.label} onPointerEnter={() => setActive(index)}>
                    {/* พื้นที่รับ hover กว้างเต็มช่อง ไม่ต้องเล็งให้ตรงแท่ง */}
                    <rect
                      x={padding.left + band * index}
                      y={padding.top}
                      width={band}
                      height={plotHeight}
                      fill={active === index ? GRID : "transparent"}
                      opacity={active === index ? 0.4 : 1}
                    />
                    <path d={barPath(x, baseline - barHeight, barWidth, barHeight)} fill={ACCENT} />
                    {index % labelStep === 0 ? (
                      <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                        {point.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {active !== null ? (
              <Tooltip
                x={Math.min(Math.max(padding.left + band * active + band / 2, 60), width - 60)}
                label={data[active].label}
                value={`${format(data[active].value)}${unit ? ` ${unit}` : ""}`}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------ แท่งแนวนอน */

/**
 * รายการจัดอันดับ — ทำด้วย HTML ไม่ใช่ SVG เพราะข้อความไทยยาวไม่เท่ากัน
 * ปล่อยให้เบราว์เซอร์จัดบรรทัดเองปลอดภัยกว่า
 */
export function RankedBars({
  data,
  unit,
  numberFormat = "full",
  className
}: {
  data: SeriesPoint[];
  unit?: string;
  numberFormat?: NumberFormat;
  className?: string;
}) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const format = formatBy(numberFormat);

  return (
    <ul className={cn("grid gap-3", className)}>
      {data.map((point) => (
        <li key={point.label} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{point.label}</span>
            <span className="tabular shrink-0 text-muted-foreground">
              {format(point.value)}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (point.value / max) * 100)}%`, background: ACCENT }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- Sparkline */

/**
 * เส้นเล็กในการ์ด KPI — ไม่มีแกน ไม่มี tooltip ค่าจริงอยู่ในตัวเลขด้านบนแล้ว
 * ย่อ/ขยายตามสัดส่วนเดิม (ไม่ใช้ preserveAspectRatio="none") จุดปลายจะได้ไม่ถูกยืดเป็นวงรี
 */
export function Sparkline({ data, height = 40 }: { data: SeriesPoint[]; height?: number }) {
  const width = 160;
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = data.map((point, index) => ({
    x: (width * index) / Math.max(1, data.length - 1),
    y: height - 4 - ((point.value - min) / span) * (height - 8)
  }));

  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-hidden focusable="false">
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={ACCENT} opacity={0.1} />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={3} fill={ACCENT} stroke={SURFACE} strokeWidth={2} />
    </svg>
  );
}
