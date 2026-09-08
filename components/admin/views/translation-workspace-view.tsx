"use client";

import Link from "next/link";
import { Bot, RefreshCw, Save, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { AiTranslationProgress } from "@/components/admin/ai-translation-visual";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import type { getTranslationWorkspace } from "@/services/translation-service";

type Data = NonNullable<Awaited<ReturnType<typeof getTranslationWorkspace>>>;
type Glossary = Data["glossary"][number];
type Character = Data["characters"][number];

async function mutate(url: string, method: "POST" | "PATCH", body?: unknown) {
  const response = await fetch(url, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return payload;
}

export function TranslationWorkspaceView({ data, canCancelJobs }: { data: Data; canCancelJobs: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [glossary, setGlossary] = useState<Glossary[]>(data.glossary);
  const [characters, setCharacters] = useState<Character[]>(data.characters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeJobs = data.jobs.some((job) => job.status === "QUEUED" || job.status === "RUNNING");
  const activeJob = data.jobs.find((job) => job.status === "RUNNING") ?? data.jobs.find((job) => job.status === "QUEUED");

  useEffect(() => {
    if (!activeJobs) return;
    const timer = window.setInterval(() => router.refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [activeJobs, router]);

  const translatableIds = useMemo(() => data.chapters.filter((chapter) => chapter.status !== "PUBLISHED").map((chapter) => chapter.id), [data.chapters]);
  const allSelected = translatableIds.length > 0 && translatableIds.every((id) => selected.has(id));

  async function perform(key: string, work: () => Promise<unknown>, success: string) {
    setBusy(key); setError(""); setMessage("");
    try { await work(); setMessage(success); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "ดำเนินการไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function saveConfiguration(formData: FormData) {
    await perform("save", () => mutate(`/api/admin/translation/workspaces/${data.workspace.id}`, "PATCH", {
      expectedVersion: data.workspace.version,
      profile: {
        name: formData.get("profileName"), styleGuide: formData.get("styleGuide"), instructions: formData.get("instructions"), preserveParagraphs: formData.get("preserveParagraphs") === "on",
      },
      glossary: glossary.map(({ sourceTerm, targetTerm, note, isLocked }) => ({ sourceTerm, targetTerm, note, isLocked })),
      characters: characters.map(({ sourceName, targetName, aliases, description, speakingStyle, isLocked }) => ({ sourceName, targetName, aliases, description, speakingStyle, isLocked })),
    }), "บันทึกการตั้งค่าแล้ว");
  }

  async function enqueue() {
    if (!selected.size) { setError("เลือกอย่างน้อย 1 ตอน"); return; }
    await perform("enqueue", () => mutate(`/api/admin/translation/workspaces/${data.workspace.id}/jobs`, "POST", {
      chapterIds: [...selected], idempotencyKey: `${data.workspace.id}:${crypto.randomUUID()}`,
    }), "เพิ่มงานแปลลงคิวแล้ว");
    setSelected(new Set());
  }

  return <div className="grid gap-5">
    {error ? <div role="alert" className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
    {message ? <div role="status" className="rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}
    {activeJob ? <AiTranslationProgress completed={activeJob.completedItems + activeJob.failedItems} total={activeJob.totalItems} label={activeJob.status === "QUEUED" ? "AI กำลังเตรียมคิวแปล" : "AI กำลังแปลนิยาย"} /> : null}

    <form action={saveConfiguration} className="grid gap-5">
      <Panel title="Translation Profile" description={`เวอร์ชัน ${data.profile?.version ?? 1}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ชื่อ Profile"><Input name="profileName" required defaultValue={data.profile?.name ?? "Default"} /></Field>
          <div className="rounded-[10px] bg-muted px-3 py-2 text-sm text-muted-foreground">Public novel: {data.workspace.novelId ? "สร้างแล้ว" : "ระบบจะสร้างให้อัตโนมัติเมื่อ Publish ครั้งแรก"}</div>
          <div className="md:col-span-2"><Field label="Style guide"><Textarea name="styleGuide" className="min-h-32" defaultValue={data.profile?.styleGuide ?? ""} /></Field></div>
          <div className="md:col-span-2"><Field label="คำสั่งเพิ่มเติม"><Textarea name="instructions" className="min-h-28" defaultValue={data.profile?.instructions ?? ""} /></Field></div>
          <label className="flex items-center gap-2 text-sm"><input name="preserveParagraphs" type="checkbox" defaultChecked={data.profile?.preserveParagraphs ?? true} /> รักษาการแบ่งย่อหน้าต้นฉบับ</label>
        </div>
      </Panel>

      <Panel title="Glossary" description="คำที่ล็อกไว้จะถูกเลือกเข้า context เฉพาะเมื่อพบในตอนนั้น">
        <div className="grid gap-3">
          {glossary.map((entry, index) => <div key={entry.id ?? index} className="grid gap-2 md:grid-cols-[1fr_1fr_1.4fr_auto_auto]">
            <Input aria-label="คำต้นฉบับ" value={entry.sourceTerm} placeholder="คำต้นฉบับ" onChange={(event) => setGlossary((rows) => rows.map((row, i) => i === index ? { ...row, sourceTerm: event.target.value } : row))} />
            <Input aria-label="คำแปล" value={entry.targetTerm} placeholder="คำแปลที่กำหนด" onChange={(event) => setGlossary((rows) => rows.map((row, i) => i === index ? { ...row, targetTerm: event.target.value } : row))} />
            <Input aria-label="หมายเหตุ" value={entry.note ?? ""} placeholder="หมายเหตุ" onChange={(event) => setGlossary((rows) => rows.map((row, i) => i === index ? { ...row, note: event.target.value } : row))} />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={entry.isLocked} onChange={(event) => setGlossary((rows) => rows.map((row, i) => i === index ? { ...row, isLocked: event.target.checked } : row))} />ล็อก</label>
            <Button type="button" variant="ghost" size="icon" aria-label="ลบคำศัพท์" onClick={() => setGlossary((rows) => rows.filter((_, i) => i !== index))}><XCircle className="h-4 w-4" /></Button>
          </div>)}
          <Button type="button" variant="outline" className="justify-self-start" onClick={() => setGlossary((rows) => [...rows, { id: crypto.randomUUID(), workspaceId: data.workspace.id, sourceTerm: "", targetTerm: "", note: null, isLocked: true, version: 1, createdBy: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])}>เพิ่มคำศัพท์</Button>
        </div>
      </Panel>

      <Panel title="Characters" description="ชื่อและลักษณะการพูดจะเข้า context เฉพาะตอนที่พบตัวละคร">
        <div className="grid gap-3">
          {characters.map((character, index) => <div key={character.id ?? index} className="grid gap-2 rounded-[10px] border border-border p-3 md:grid-cols-2">
            <Input aria-label="ชื่อต้นฉบับ" value={character.sourceName} placeholder="ชื่อต้นฉบับ" onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, sourceName: event.target.value } : row))} />
            <Input aria-label="ชื่อแปล" value={character.targetName} placeholder="ชื่อแปล" onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, targetName: event.target.value } : row))} />
            <Input aria-label="ชื่อเรียกอื่น" value={character.aliases.join(", ")} placeholder="ชื่อเรียกอื่น คั่นด้วย comma" onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, aliases: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : row))} />
            <Input aria-label="ลักษณะการพูด" value={character.speakingStyle ?? ""} placeholder="ลักษณะการพูด" onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, speakingStyle: event.target.value } : row))} />
            <div className="flex items-center gap-3 md:col-span-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={character.isLocked} onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, isLocked: event.target.checked } : row))} />ล็อก</label><Button type="button" variant="ghost" size="sm" onClick={() => setCharacters((rows) => rows.filter((_, i) => i !== index))}>ลบ</Button></div>
          </div>)}
          <Button type="button" variant="outline" className="justify-self-start" onClick={() => setCharacters((rows) => [...rows, { id: crypto.randomUUID(), workspaceId: data.workspace.id, sourceName: "", targetName: "", aliases: [], description: null, speakingStyle: null, isLocked: true, version: 1, createdBy: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])}>เพิ่มตัวละคร</Button>
        </div>
      </Panel>
      <Button type="submit" loading={busy === "save"} className="justify-self-start"><Save className="h-4 w-4" />บันทึก Profile และ Context Data</Button>
    </form>

    <Panel title="Automatic translation" description="ระบบเลือก active model ที่รองรับคู่ภาษาและมี priority เหมาะสมที่สุด พร้อมใช้ prompt ล่าสุดให้อัตโนมัติ">
      <form action={enqueue} className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">งานแปลหลักใช้ GPT-5.6 Sol; ระบบจะ bootstrap model และ prompt ให้เอง</p>
        <Button type="submit" loading={busy === "enqueue"}><Bot className="h-4 w-4" />แปลตอนที่เลือก {selected.size} ตอน</Button>
      </form>
    </Panel>

    <Panel title={`ตอนทั้งหมด (${data.chapters.length.toLocaleString("th-TH")})`} action={<Button type="button" variant="outline" loading={busy === "sync"} onClick={() => perform("sync", () => mutate(`/api/admin/translation/workspaces/${data.workspace.id}/sync`, "POST"), "ซิงก์ต้นฉบับแล้ว")}><RefreshCw className="h-4 w-4" />ซิงก์ต้นฉบับ</Button>} bodyClassName="p-0">
      <div className="max-h-[620px] overflow-auto"><table className="w-full min-w-[720px] text-sm"><thead className="sticky top-0 bg-muted"><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-3"><input type="checkbox" checked={allSelected} aria-label="เลือกทุกตอน" onChange={() => setSelected(allSelected ? new Set() : new Set(translatableIds.slice(0, 100)))} /></th><th className="px-4 py-3">ตอน</th><th className="px-4 py-3">ชื่อต้นฉบับ</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">Revision</th><th className="px-4 py-3">QA</th><th className="px-4 py-3" /></tr></thead><tbody>{data.chapters.map((chapter) => <tr key={chapter.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3"><input type="checkbox" disabled={chapter.status === "PUBLISHED"} checked={selected.has(chapter.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(chapter.id)) next.delete(chapter.id); else if (next.size < 100) next.add(chapter.id); return next; })} /></td><td className="px-4 py-3 font-semibold tabular">{chapter.chapterNumber}</td><td className="max-w-md truncate px-4 py-3">{chapter.sourceTitle || `Chapter ${chapter.chapterNumber}`}</td><td className="px-4 py-3"><StatusPill label={chapter.status} tone={chapter.status === "PUBLISHED" || chapter.status === "APPROVED" ? "success" : chapter.status === "FAILED" || chapter.status === "QA_FAILED" ? "danger" : chapter.status === "TRANSLATING" || chapter.status === "QUEUED" ? "info" : "neutral"} /></td><td className="px-4 py-3 tabular">{chapter.revision}</td><td className="px-4 py-3">{chapter.criticalIssues ? <span className="text-destructive">{chapter.criticalIssues} critical</span> : "ผ่าน"}</td><td className="px-4 py-3 text-right"><Link className="font-semibold text-[var(--brand-light-on-light)] hover:underline" href={`/admin/translation/${data.workspace.id}/chapters/${chapter.id}`}>แก้ไข</Link></td></tr>)}</tbody></table></div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">หนึ่งงานเลือกได้สูงสุด 100 ตอน เพื่อให้ retry และติดตามผลได้ละเอียด</p>
    </Panel>

    <Panel title="Job history" bodyClassName="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-3">เริ่มเมื่อ</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">ผิดพลาด</th><th className="px-4 py-3" /></tr></thead><tbody>{data.jobs.map((job) => <tr key={job.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 whitespace-nowrap">{new Date(job.createdAt).toLocaleString("th-TH")}</td><td className="px-4 py-3"><StatusPill label={job.status} tone={job.status === "COMPLETED" ? "success" : job.status === "FAILED" ? "danger" : "info"} /></td><td className="px-4 py-3 tabular">{job.completedItems + job.failedItems} / {job.totalItems}</td><td className="max-w-sm truncate px-4 py-3 text-xs text-destructive">{job.lastError}</td><td className="px-4 py-3 text-right">{canCancelJobs && (job.status === "QUEUED" || job.status === "RUNNING") ? <Button type="button" variant="ghost" size="sm" onClick={() => perform(`cancel-${job.id}`, () => mutate(`/api/admin/translation/jobs/${job.id}/cancel`, "POST"), "ส่งคำสั่งยกเลิกแล้ว")}>ยกเลิก</Button> : null}</td></tr>)}{!data.jobs.length ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">ยังไม่มีงานแปล</td></tr> : null}</tbody></table></div></Panel>
  </div>;
}
