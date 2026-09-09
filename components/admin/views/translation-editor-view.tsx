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

async function post(url: string, method: "POST" | "PATCH", body?: unknown) {
  const response = await fetch(url, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return payload;
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

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("translation-editor-source-width"));
    if (saved >= 25 && saved <= 55) window.requestAnimationFrame(() => setSourceWidth(saved));
  }, []);

  async function perform(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key); setError(""); setMessage("");
    try { await action(); setMessage(success); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "ดำเนินการไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  const chapterUrl = `/api/admin/translation/workspaces/${workspaceId}/chapters/${chapterId}`;
  const criticalCount = data.issues.filter((issue) => issue.severity === "CRITICAL" && !issue.resolvedAt).length;

  function suggestionFor(issue: Data["issues"][number]) {
    const metadata = issue.metadata && typeof issue.metadata === "object" ? issue.metadata : {};
    const location = metadata.location === "TITLE" || metadata.location === "CONTENT" ? metadata.location : null;
    const currentText = typeof metadata.currentText === "string" ? metadata.currentText : null;
    const suggestedText = typeof metadata.suggestedText === "string" ? metadata.suggestedText : null;
    return location && suggestedText ? { location, currentText, suggestedText } : null;
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
        <Button type="button" variant="secondary" disabled={!latest || criticalCount > 0 || latest.status === "APPROVED" || latest.status === "PUBLISHED"} loading={busy === "approve"} onClick={() => latest && perform("approve", () => post(`${chapterUrl}/versions/${latest.id}/approve`, "POST"), "อนุมัติและสร้างตอนฉบับร่างแล้ว")}><CheckCircle2 className="h-4 w-4" />Approve เป็น Draft</Button>
        {canPublish ? <Button type="button" disabled={!latest || latest.status !== "APPROVED"} loading={busy === "publish"} onClick={() => latest && perform("publish", () => post(`${chapterUrl}/versions/${latest.id}/publish`, "POST"), "เผยแพร่ตอนแล้ว")}><CloudUpload className="h-4 w-4" />Publish</Button> : null}
      </div>
    </div>

    {error ? <div role="alert" className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
    {message ? <div role="status" className="rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}
    {!data.workspace.novelId && canPublish ? <div className="rounded-[12px] border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-700 dark:text-sky-300">Publish ครั้งแรกจะสร้างนิยายสาธารณะและเชื่อมตอนให้อัตโนมัติ</div> : null}

    <label className="hidden items-center gap-3 rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground lg:flex">ความกว้างต้นฉบับ<input className="w-52 accent-[var(--brand-primary)]" type="range" min="25" max="55" value={sourceWidth} onChange={(event) => { const value = Number(event.target.value); setSourceWidth(value); window.localStorage.setItem("translation-editor-source-width", String(value)); }} /><span>{sourceWidth}%</span></label>

    <div className="grid gap-4 lg:min-h-[calc(100vh-240px)] lg:grid-cols-[var(--source-width)_minmax(0,1fr)_280px]" style={{ "--source-width": `${sourceWidth}%` } as React.CSSProperties}>
      <section className="min-w-0 overflow-hidden rounded-[14px] border border-border bg-card"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">ต้นฉบับ</h2><p className="text-xs text-muted-foreground">Snapshot v{data.source.version} · {data.source.hash.slice(0, 10)}</p></div><div className="max-h-[calc(100vh-310px)] overflow-auto p-4"><h3 className="mb-4 font-semibold">{data.source.title}</h3><pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground">{data.source.content}</pre></div></section>

      <section className="min-w-0 rounded-[14px] border border-border bg-card"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">คำแปล</h2><p className="text-xs text-muted-foreground">ทุกครั้งที่บันทึกจะสร้าง immutable revision ใหม่</p></div><div className="grid gap-3 p-4"><Input aria-label="ชื่อตอนแปล" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="ชื่อตอน" /><Textarea aria-label="เนื้อหาคำแปล" value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[calc(100vh-390px)] resize-y font-sans leading-7" placeholder="คำแปลจะแสดงที่นี่ หรือพิมพ์คำแปลด้วยตนเอง" /><p className="text-right text-xs text-muted-foreground">{content.length.toLocaleString("th-TH")} ตัวอักษร</p></div></section>

      <aside className="grid content-start gap-4">
        <details open className="rounded-[14px] border border-border bg-card"><summary className="cursor-pointer px-4 py-3 font-semibold">QA ({data.issues.length})</summary><div className="grid gap-2 border-t border-border p-3">{data.issues.map((issue) => {
          const suggestion = suggestionFor(issue);
          return <div key={issue.id} className={`rounded-[9px] px-3 py-2 text-xs ${issue.severity === "CRITICAL" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}><strong>{issue.code}</strong><p className="mt-1 leading-relaxed">{issue.message}</p>{suggestion ? <div className="mt-2 rounded-md bg-card/80 p-2 text-foreground"><p className="line-clamp-2 text-muted-foreground">เดิม: {suggestion.currentText || "ชื่อปัจจุบัน"}</p><p className="mt-1 line-clamp-3">แนะนำ: {suggestion.suggestedText}</p><Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => applyQaSuggestion(issue)}>ใช้คำแนะนำนี้</Button></div> : null}</div>;
        })}{!data.issues.length ? <p className="text-xs text-muted-foreground">ยังไม่มีปัญหา QA</p> : null}</div></details>
        <details open className="rounded-[14px] border border-border bg-card"><summary className="cursor-pointer px-4 py-3 font-semibold">Context</summary><div className="grid gap-4 border-t border-border p-3 text-xs"><div><h3 className="font-semibold">Glossary ที่เกี่ยวข้อง</h3>{data.glossary.map((term) => <p key={term.sourceTerm} className="mt-1 text-muted-foreground">{term.sourceTerm} → {term.targetTerm}</p>)}{!data.glossary.length ? <p className="mt-1 text-muted-foreground">ไม่มี</p> : null}</div><div><h3 className="font-semibold">Characters</h3>{data.characters.map((character) => <p key={character.sourceName} className="mt-1 text-muted-foreground">{character.sourceName} → {character.targetName}</p>)}{!data.characters.length ? <p className="mt-1 text-muted-foreground">ไม่มี</p> : null}</div><div><h3 className="font-semibold">Style</h3><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{data.profile?.styleGuide || "ยังไม่ได้กำหนด"}</p></div></div></details>
        <details className="rounded-[14px] border border-border bg-card"><summary className="cursor-pointer px-4 py-3 font-semibold">Revision history ({data.history.length})</summary><div className="grid gap-1 border-t border-border p-3">{data.history.map((version) => <div key={version.id} className="flex justify-between gap-2 rounded px-2 py-1.5 text-xs"><span>v{version.revision} · {version.origin}</span><span>{version.status}</span></div>)}</div></details>
      </aside>
    </div>
  </div>;
}
