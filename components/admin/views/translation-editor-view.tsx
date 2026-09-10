"use client";

import Link from "next/link";
import { CheckCircle2, CloudUpload, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-controls";
import type { getTranslationChapterEditor } from "@/services/translation-service";

type Data = NonNullable<Awaited<ReturnType<typeof getTranslationChapterEditor>>>;
type LockedGlossaryResolution = { stillPresent?: boolean; resolved?: boolean };

async function post<T = unknown>(url: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return payload as T;
}

export function TranslationEditorView({ data, canPublish }: { data: Data; canPublish: boolean }) {
  const router = useRouter();
  const workspaceId = data.workspace.id;
  const chapterId = data.chapter.id;
  const latest = data.latestVersion;
  const [title, setTitle] = useState(latest?.title ?? data.source.title ?? `Chapter ${data.chapter.chapterNumber}`);
  const [content, setContent] = useState(latest?.content ?? "");
  const [sourceWidth, setSourceWidth] = useState(36);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [glossaryAlternatives, setGlossaryAlternatives] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("translation-editor-source-width"));
    if (saved >= 25 && saved <= 55) window.requestAnimationFrame(() => setSourceWidth(saved));
  }, []);

  async function perform<T>(key: string, action: () => Promise<T>, success: string | ((result: T) => string)) {
    setBusy(key); setError(""); setMessage("");
    try { const result = await action(); setMessage(typeof success === "function" ? success(result) : success); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "ดำเนินการไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  const chapterUrl = `/api/admin/translation/workspaces/${workspaceId}/chapters/${chapterId}`;
  const unresolvedIssues = data.issues.filter((issue) => !issue.resolvedAt);
  const criticalCount = unresolvedIssues.filter((issue) => issue.severity === "CRITICAL").length;

  function suggestionFor(issue: Data["issues"][number]) {
    const metadata = issue.metadata && typeof issue.metadata === "object" ? issue.metadata : {};
    const location = metadata.location === "TITLE" || metadata.location === "CONTENT" ? metadata.location : null;
    const currentText = typeof metadata.currentText === "string" ? metadata.currentText : null;
    const suggestedText = typeof metadata.suggestedText === "string" ? metadata.suggestedText : null;
    return location && suggestedText ? { location, currentText, suggestedText } : null;
  }

  function lockedGlossaryFor(issue: Data["issues"][number]) {
    if (issue.code !== "LOCKED_GLOSSARY_MISSING") return null;
    const metadata = issue.metadata && typeof issue.metadata === "object" ? issue.metadata : {};
    const sourceTerm = typeof metadata.sourceTerm === "string" ? metadata.sourceTerm : null;
    const targetTerm = typeof metadata.targetTerm === "string" ? metadata.targetTerm : null;
    const sourceSegmentIndex = typeof metadata.sourceSegmentIndex === "number" ? metadata.sourceSegmentIndex : null;
    const translationSegmentIndex = typeof metadata.translationSegmentIndex === "number" ? metadata.translationSegmentIndex : null;
    const sourceExcerpt = typeof metadata.sourceExcerpt === "string" ? metadata.sourceExcerpt : null;
    const translatedExcerpt = typeof metadata.translatedExcerpt === "string" ? metadata.translatedExcerpt : null;
    const mappingConfidence = metadata.mappingConfidence === "HIGH" || metadata.mappingConfidence === "APPROXIMATE"
      ? metadata.mappingConfidence
      : null;
    return sourceTerm && targetTerm ? {
      sourceTerm,
      targetTerm,
      sourceSegmentIndex,
      translationSegmentIndex,
      sourceExcerpt,
      translatedExcerpt,
      mappingConfidence,
    } : null;
  }

  function resolveLockedIssue(issue: Data["issues"][number], action: "ADD_ALTERNATIVE" | "UNLOCK_TERM" | "RECHECK") {
    const alternative = glossaryAlternatives[issue.id]?.trim() ?? "";
    if (action === "ADD_ALTERNATIVE" && !alternative) {
      setError("กรอกคำแปลที่ใช้จริงก่อนเพิ่มเป็นคำทางเลือก");
      return;
    }
    const body = action === "ADD_ALTERNATIVE" ? { action, alternative } : { action };
    void perform(
      `resolve-${issue.id}`,
      () => post<LockedGlossaryResolution>(`${chapterUrl}/qa-issues/${issue.id}/resolve`, "POST", body),
      action === "ADD_ALTERNATIVE"
        ? "เพิ่มคำแปลทางเลือกและแก้ QA รายการนี้แล้ว"
        : action === "UNLOCK_TERM"
          ? "ปลดล็อก Glossary และแก้ QA รายการนี้แล้ว"
          : (result) => result.stillPresent
            ? "พบคำต้นฉบับจริงและอัปเดตตำแหน่งที่ต้องแก้แล้ว"
            : "ตรวจใหม่แล้วไม่พบคำต้นฉบับแบบตรงตัว จึงเคลียร์ QA เก่าที่ตรวจผิดแล้ว",
    );
  }

  function applyQaSuggestion(issue: Data["issues"][number]) {
    const suggestion = suggestionFor(issue);
    if (!suggestion) return;
    if (suggestion.location === "TITLE") {
      setTitle(suggestion.currentText && title.includes(suggestion.currentText)
        ? title.replace(suggestion.currentText, suggestion.suggestedText)
        : suggestion.suggestedText);
    } else {
      if (!suggestion.currentText || !content.includes(suggestion.currentText)) {
        setError("หาข้อความเดิมในฉบับแปลไม่พบ อาจมีการแก้ไขหลัง QA กรุณาตรวจคำแนะนำแล้วแก้ด้วยตนเอง");
        return;
      }
      setContent(content.replace(suggestion.currentText, suggestion.suggestedText));
    }
    setError("");
    setMessage("ใช้คำแนะนำในช่องแก้ไขแล้ว กรุณาตรวจและกด “บันทึก Revision” เพื่อรัน QA ใหม่");
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-4 py-3 shadow-[var(--sh-1)]">
      <div className="min-w-0"><Link href={`/admin/translation/${workspaceId}`} className="text-xs font-medium text-[var(--brand-light-on-light)] hover:underline">← {data.workspace.sourceLanguage} → {data.workspace.targetLanguage}</Link><h1 className="mt-1 truncate text-lg font-bold">ตอน {data.chapter.chapterNumber}: {data.source.title}</h1></div>
      <div className="flex flex-wrap items-center gap-2"><StatusPill label={data.chapter.status} tone={data.chapter.status === "APPROVED" || data.chapter.status === "PUBLISHED" ? "success" : criticalCount ? "danger" : "info"} />
        <Button type="button" variant="outline" loading={busy === "save"} onClick={() => perform("save", () => post(chapterUrl, "PATCH", { expectedLockVersion: data.chapter.lockVersion, parentVersionId: latest?.id ?? null, title, content }), "บันทึก revision ใหม่และตรวจ QA แล้ว")}><Save className="h-4 w-4" />บันทึก Revision</Button>
        {latest && latest.status !== "APPROVED" && latest.status !== "PUBLISHED" ? <Button type="button" variant="secondary" disabled={criticalCount > 0} loading={busy === "approve"} onClick={() => perform("approve", () => post(`${chapterUrl}/versions/${latest.id}/approve`, "POST"), "อนุมัติและสร้างตอนฉบับร่างแล้ว")}><CheckCircle2 className="h-4 w-4" />ยืนยัน QA</Button> : null}
        {canPublish ? <Button type="button" disabled={!latest || latest.status !== "APPROVED"} loading={busy === "publish"} onClick={() => latest && perform("publish", () => post(`${chapterUrl}/versions/${latest.id}/publish`, "POST"), "เผยแพร่ตอนแล้ว")}><CloudUpload className="h-4 w-4" />เผยแพร่</Button> : null}
      </div>
    </div>

    {error ? <div role="alert" className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
    {message ? <div role="status" className="rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}
    {latest?.status === "APPROVED" && latest.origin === "AI" ? <div role="status" className="rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">QA ตรวจและแก้ไขอัตโนมัติผ่านแล้ว ตอนนี้พร้อมกด “เผยแพร่” ได้ทันที</div> : null}
    {!data.workspace.novelId && canPublish ? <div className="rounded-[12px] border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-700 dark:text-sky-300">Publish ครั้งแรกจะสร้างนิยายสาธารณะและเชื่อมตอนให้อัตโนมัติ</div> : null}

    <label className="hidden items-center gap-3 rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground lg:flex">ความกว้างต้นฉบับ<input className="w-52 accent-[var(--brand-primary)]" type="range" min="25" max="55" value={sourceWidth} onChange={(event) => { const value = Number(event.target.value); setSourceWidth(value); window.localStorage.setItem("translation-editor-source-width", String(value)); }} /><span>{sourceWidth}%</span></label>

    <div className="grid gap-4 lg:min-h-[calc(100vh-240px)] lg:grid-cols-[var(--source-width)_minmax(0,1fr)_280px]" style={{ "--source-width": `${sourceWidth}%` } as React.CSSProperties}>
      <section className="min-w-0 overflow-hidden rounded-[14px] border border-border bg-card"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">ต้นฉบับ</h2><p className="text-xs text-muted-foreground">Snapshot v{data.source.version} · {data.source.hash.slice(0, 10)}</p></div><div className="max-h-[calc(100vh-310px)] overflow-auto p-4"><h3 className="mb-4 font-semibold">{data.source.title}</h3><pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground">{data.source.content}</pre></div></section>

      <section className="min-w-0 rounded-[14px] border border-border bg-card"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">คำแปล</h2><p className="text-xs text-muted-foreground">ทุกครั้งที่บันทึกจะสร้าง immutable revision ใหม่</p></div><div className="grid gap-3 p-4"><Input aria-label="ชื่อตอนแปล" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="ชื่อตอน" /><Textarea aria-label="เนื้อหาคำแปล" value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[calc(100vh-390px)] resize-y font-sans leading-7" placeholder="คำแปลจะแสดงที่นี่ หรือพิมพ์คำแปลด้วยตนเอง" /><p className="text-right text-xs text-muted-foreground">{content.length.toLocaleString("th-TH")} ตัวอักษร</p></div></section>

      <aside className="grid content-start gap-4">
        <details open className="rounded-[14px] border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 font-semibold">QA ({unresolvedIssues.length})</summary>
          <div className="grid gap-2 border-t border-border p-3">
            {unresolvedIssues.map((issue) => {
              const suggestion = suggestionFor(issue);
              const lockedGlossary = lockedGlossaryFor(issue);
              const resolving = busy === `resolve-${issue.id}`;
              return <div key={issue.id} className={`rounded-[9px] px-3 py-2 text-xs ${issue.severity === "CRITICAL" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                <strong>{issue.code}</strong>
                <p className="mt-1 leading-relaxed">{issue.message}</p>
                {suggestion ? <div className="mt-2 rounded-md bg-card/80 p-2 text-foreground">
                  <p className="line-clamp-2 text-muted-foreground">เดิม: {suggestion.currentText || "ชื่อปัจจุบัน"}</p>
                  <p className="mt-1 line-clamp-3">แนะนำ: {suggestion.suggestedText}</p>
                  <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => applyQaSuggestion(issue)}>ใช้คำแนะนำนี้</Button>
                </div> : null}
                {lockedGlossary ? <div className="mt-2 grid gap-2 rounded-md border border-destructive/20 bg-card/90 p-2 text-foreground">
                  <div>
                    <p><span className="text-muted-foreground">คำต้นฉบับ:</span> {lockedGlossary.sourceTerm}</p>
                    <p className="mt-1"><span className="text-muted-foreground">คำที่ล็อก:</span> {lockedGlossary.targetTerm}</p>
                  </div>
                  {lockedGlossary.sourceSegmentIndex !== null ? <div className="grid gap-2 rounded-md bg-muted/70 p-2">
                    <p className="font-semibold text-foreground">
                      พบที่ต้นฉบับย่อหน้า {lockedGlossary.sourceSegmentIndex + 1}
                      {lockedGlossary.translationSegmentIndex !== null ? ` · คำแปลย่อหน้า ${lockedGlossary.translationSegmentIndex + 1}` : ""}
                    </p>
                    {lockedGlossary.sourceExcerpt ? <p className="line-clamp-3 text-muted-foreground">ต้นฉบับ: {lockedGlossary.sourceExcerpt}</p> : null}
                    {lockedGlossary.translatedExcerpt ? <p className="line-clamp-4 text-foreground">คำแปลปัจจุบัน: {lockedGlossary.translatedExcerpt}</p> : null}
                    {lockedGlossary.mappingConfidence === "APPROXIMATE" ? <p className="text-amber-700 dark:text-amber-300">จำนวนย่อหน้าไม่ตรงกัน ตำแหน่งคำแปลเป็นตำแหน่งประมาณการ</p> : null}
                  </div> : <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-amber-800 dark:text-amber-200">
                    QA รุ่นเก่ายังไม่มีตำแหน่ง กดตรวจใหม่เพื่อค้นหาคำแบบตรงตัวก่อนแก้
                  </div>}
                  {lockedGlossary.sourceSegmentIndex !== null ? <label className="grid gap-1 font-medium" htmlFor={`qa-alternative-${issue.id}`}>
                    คำแปลที่ใช้จริงในตอนนี้
                    <Input
                      id={`qa-alternative-${issue.id}`}
                      value={glossaryAlternatives[issue.id] ?? ""}
                      onChange={(event) => setGlossaryAlternatives((current) => ({ ...current, [issue.id]: event.target.value }))}
                      placeholder="คัดลอกคำจากเนื้อหาแปล"
                      disabled={Boolean(busy)}
                    />
                  </label> : null}
                  <div className="flex flex-wrap gap-2">
                    {lockedGlossary.sourceSegmentIndex !== null ? <>
                      <Button type="button" size="sm" loading={resolving} disabled={Boolean(busy) && !resolving} onClick={() => resolveLockedIssue(issue, "ADD_ALTERNATIVE")}>เพิ่มเป็นคำทางเลือก</Button>
                      <Button type="button" size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => resolveLockedIssue(issue, "UNLOCK_TERM")}>คำนี้ขึ้นกับบริบท — ไม่ล็อก</Button>
                    </> : null}
                    <Button type="button" size="sm" variant="outline" loading={resolving} disabled={Boolean(busy) && !resolving} onClick={() => resolveLockedIssue(issue, "RECHECK")}>ตรวจตำแหน่งใหม่</Button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">เพิ่มคำทางเลือกเมื่อคำในฉบับแปลถูกต้อง หรือปลดล็อกเมื่อคำนี้เปลี่ยนตามบริบทได้ ระบบจะเคลียร์ Critical รายการนี้ทันที</p>
                </div> : null}
              </div>;
            })}
            {!unresolvedIssues.length ? <p className="text-xs text-muted-foreground">ไม่มีปัญหา QA ที่ยังไม่ได้แก้</p> : null}
          </div>
        </details>
        <details open className="rounded-[14px] border border-border bg-card"><summary className="cursor-pointer px-4 py-3 font-semibold">Context</summary><div className="grid gap-4 border-t border-border p-3 text-xs"><div><h3 className="font-semibold">Glossary ที่เกี่ยวข้อง</h3>{data.glossary.map((term) => <p key={term.sourceTerm} className="mt-1 text-muted-foreground">{term.sourceTerm} → {term.targetTerm}</p>)}{!data.glossary.length ? <p className="mt-1 text-muted-foreground">ไม่มี</p> : null}</div><div><h3 className="font-semibold">Characters</h3>{data.characters.map((character) => <p key={character.sourceName} className="mt-1 text-muted-foreground">{character.sourceName} → {character.targetName}</p>)}{!data.characters.length ? <p className="mt-1 text-muted-foreground">ไม่มี</p> : null}</div><div><h3 className="font-semibold">Style</h3><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{data.profile?.styleGuide || "ยังไม่ได้กำหนด"}</p></div></div></details>
        <details className="rounded-[14px] border border-border bg-card"><summary className="cursor-pointer px-4 py-3 font-semibold">Revision history ({data.history.length})</summary><div className="grid gap-1 border-t border-border p-3">{data.history.map((version) => <div key={version.id} className="flex justify-between gap-2 rounded px-2 py-1.5 text-xs"><span>v{version.revision} · {version.origin}</span><span>{version.status}</span></div>)}</div></details>
      </aside>
    </div>
  </div>;
}
