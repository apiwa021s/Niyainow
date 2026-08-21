"use client";

import { BookA, Check, FileUp, Plus, ScanText } from "lucide-react";
import { useMemo, useState } from "react";

import { whole } from "@/components/studio/mock-data";
import {
  glossaryEntries,
  glossaryKindLabels,
  glossaryWorks,
  type GlossaryKind,
} from "@/components/studio/mock-workflow";
import { EmptyState, StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KINDS = Object.keys(glossaryKindLabels) as GlossaryKind[];

/** Edit distance, small strings only — enough to catch a swapped vowel or tone mark. */
function distance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] =
        a[i - 1] === b[j - 1]
          ? rows[i - 1][j - 1]
          : 1 + Math.min(rows[i - 1][j], rows[i][j - 1], rows[i - 1][j - 1]);
    }
  }
  return rows[a.length][b.length];
}

type Finding = { id: string; found: string; expected: string; index: number };

/**
 * Near-miss detector for Thai transliterations. Words that differ by one or two
 * characters from a glossary entry are almost always the same name with a
 * dropped tone mark, which is exactly the drift a reader notices and a
 * spell-checker does not.
 */
function findInconsistencies(text: string): Finding[] {
  if (!text.trim()) return [];
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const token of text.split(/[\s\n\r.,;:!?"'()[\]{}—–-]+/u)) {
    const word = token.trim();
    if (word.length < 3 || seen.has(word)) continue;

    for (const entry of glossaryEntries) {
      if (word === entry.thai) break;
      const gap = distance(word, entry.thai);
      if (gap > 0 && gap <= 2 && Math.abs(word.length - entry.thai.length) <= 2) {
        findings.push({ id: `${word}-${entry.id}`, found: word, expected: entry.thai, index: text.indexOf(word) });
        seen.add(word);
        break;
      }
    }
  }

  return findings;
}

export default function GlossaryPage() {
  const [tab, setTab] = useState<"entries" | "check">("entries");
  const [workFilter, setWorkFilter] = useState("ทุกเรื่อง");
  const [kindFilter, setKindFilter] = useState<GlossaryKind | "all">("all");
  const [tooltips, setTooltips] = useState(() => new Set(glossaryEntries.filter((e) => e.tooltip).map((e) => e.id)));

  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState<Finding[] | null>(null);
  const [fixed, setFixed] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      glossaryEntries.filter(
        (entry) =>
          (workFilter === "ทุกเรื่อง" || entry.work === workFilter || entry.work === "ทุกเรื่อง") &&
          (kindFilter === "all" || entry.kind === kindFilter),
      ),
    [workFilter, kindFilter],
  );

  const openFindings = (checked ?? []).filter((finding) => !fixed.includes(finding.id));

  return (
    <>
      <StudioPageHeader
        eyebrow="GLOSSARY"
        title="คลังคำ"
        description="ชื่อเฉพาะที่ตกลงไว้ครั้งเดียว ใช้ตรงกันทั้งเรื่อง ทั้งทีม และตลอดสองพันตอน"
        action={
          <>
            <Button type="button" variant="primary">
              <Plus aria-hidden className="h-4 w-4" />
              เพิ่มคำ
            </Button>
            <Button type="button" variant="outline">
              <FileUp aria-hidden className="h-4 w-4" />
              นำเข้าจาก CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label="มุมมองคลังคำ">
        {(
          [
            { key: "entries", label: "รายการคำ" },
            { key: "check", label: "ตรวจความสม่ำเสมอ" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)]",
              tab === item.key ? "bg-[var(--brand-primary)] text-white" : "text-(--text-secondary) hover:text-(--text-primary)",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "entries" ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="grid content-start gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">เรื่อง</h2>
              <div className="mt-2 grid gap-1">
                {glossaryWorks.map((work) => (
                  <button
                    key={work}
                    type="button"
                    aria-pressed={workFilter === work}
                    onClick={() => setWorkFilter(work)}
                    className={cn(
                      "min-h-11 truncate rounded-(--r-md) px-3 text-left text-sm transition-colors duration-[var(--dur-fast)]",
                      workFilter === work
                        ? "bg-accent-subtle font-semibold text-[var(--brand-emphasis)]"
                        : "text-(--text-secondary) hover:bg-muted",
                    )}
                  >
                    {work}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">ประเภท</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  aria-pressed={kindFilter === "all"}
                  onClick={() => setKindFilter("all")}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-xs font-semibold",
                    kindFilter === "all" ? "bg-[var(--brand-primary)] text-white" : "bg-muted text-(--text-secondary)",
                  )}
                >
                  ทั้งหมด
                </button>
                {KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={kindFilter === kind}
                    onClick={() => setKindFilter(kind)}
                    className={cn(
                      "min-h-9 rounded-full px-3 text-xs font-semibold",
                      kindFilter === kind ? "bg-[var(--brand-primary)] text-white" : glossaryKindLabels[kind].className,
                    )}
                  >
                    {glossaryKindLabels[kind].label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <StudioPanel title="รายการคำ" description={`${rows.length} คำในมุมมองนี้`}>
            {rows.length === 0 ? (
              <EmptyState
                icon={BookA}
                title="ยังไม่มีคำในมุมมองนี้"
                description="เพิ่มชื่อตัวละครหลักสัก 5 ชื่อก่อนแปลตอนถัดไป แค่นี้ก็กันชื่อเพี้ยนได้เกือบทั้งเรื่องแล้ว"
                action={
                  <Button type="button" variant="primary">
                    <Plus aria-hidden className="h-4 w-4" />
                    เพิ่มคำแรก
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-200 text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-(--text-tertiary)">
                      <th scope="col" className="px-5 py-3 font-medium">ต้นฉบับ</th>
                      <th scope="col" className="px-5 py-3 font-medium">ไทย</th>
                      <th scope="col" className="px-5 py-3 font-medium">ประเภท</th>
                      <th scope="col" className="px-5 py-3 font-medium">เรื่องที่ใช้</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">ครั้งที่พบ</th>
                      <th scope="col" className="px-5 py-3 font-medium">หมายเหตุ</th>
                      <th scope="col" className="px-5 py-3 font-medium">tooltip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((entry) => {
                      const kind = glossaryKindLabels[entry.kind];
                      return (
                        <tr key={entry.id} className="transition-colors duration-[var(--dur-fast)] hover:bg-muted/50">
                          <td className="px-5 py-3.5">{entry.source}</td>
                          <td className="px-5 py-3.5 font-medium">{entry.thai}</td>
                          <td className="px-5 py-3.5">
                            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", kind.className)}>
                              {kind.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-(--text-secondary)">{entry.work}</td>
                          <td className="px-5 py-3.5 text-right tabular-nums">{whole.format(entry.hits)}</td>
                          <td className="px-5 py-3.5 text-xs text-(--text-tertiary)">{entry.note || "—"}</td>
                          <td className="px-5 py-3.5">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <span className="sr-only">แสดง tooltip ให้คนอ่านสำหรับ {entry.thai}</span>
                              <input
                                type="checkbox"
                                checked={tooltips.has(entry.id)}
                                onChange={(event) =>
                                  setTooltips((current) => {
                                    const next = new Set(current);
                                    if (event.target.checked) next.add(entry.id);
                                    else next.delete(entry.id);
                                    return next;
                                  })
                                }
                                className="h-4.5 w-4.5 accent-[var(--brand-primary)]"
                              />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="border-t border-border px-5 py-4 text-xs leading-6 text-(--text-tertiary)">
              คำที่เปิด tooltip ไว้ ผู้อ่านจะแตะที่คำนั้นในหน้าอ่านแล้วเห็นคำอธิบายสั้น ๆ ได้
            </p>
          </StudioPanel>
        </div>
      ) : (
        <StudioPanel title="ตรวจความสม่ำเสมอ" description="วางข้อความที่แปลเสร็จแล้ว ระบบจะหาชื่อที่คล้ายแต่ไม่ตรงกับคลังคำ">
          <div className="grid gap-4 p-5">
            <textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setChecked(null);
                setFixed([]);
              }}
              placeholder="วางเนื้อหาตอนที่ต้องการตรวจที่นี่…"
              className="min-h-60 w-full rounded-[6px] border border-border bg-card px-4 py-3 text-base leading-9 transition-colors duration-[var(--dur-fast)] placeholder:text-(--text-secondary) hover:border-[var(--brand-emphasis)]"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="primary" onClick={() => setChecked(findInconsistencies(draft))} disabled={!draft.trim()}>
                <ScanText aria-hidden className="h-4 w-4" />
                ตรวจ
              </Button>
              <span className="text-xs text-(--text-tertiary)">ตรวจในเครื่องคุณเอง ข้อความไม่ถูกส่งออกไปไหน</span>
            </div>

            {checked === null ? null : openFindings.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm font-medium">
                <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />
                {checked.length === 0 ? "ทุกชื่อตรงกับคลังคำแล้ว" : "แก้ครบทุกจุดแล้ว"}
              </p>
            ) : (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold">พบคำที่อาจไม่ตรงคลังคำ {openFindings.length} จุด</p>
                <ul className="mt-3 grid gap-2">
                  {openFindings.map((finding) => (
                    <li key={finding.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <mark className="rounded bg-amber-500/30 px-1 text-(--text-primary)">{finding.found}</mark>
                        <span aria-hidden className="mx-1.5 text-(--text-tertiary)">→</span>
                        <span className="font-semibold">{finding.expected}</span>
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDraft((current) => current.split(finding.found).join(finding.expected));
                            setFixed((current) => [...current, finding.id]);
                          }}
                        >
                          แก้ให้ตรง
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setFixed((current) => [...current, finding.id])}>
                          ข้าม
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </StudioPanel>
      )}
    </>
  );
}
