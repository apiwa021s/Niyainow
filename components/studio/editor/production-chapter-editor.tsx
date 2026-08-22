"use client";

import { ArrowLeft, Check, CircleAlert, Clock3, Loader2, Save, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";

type AccessMode = "free" | "paid" | "early_access" | "members_only";
type Story = { id: string; slug: string; title: string; heatLevel: number | null };
type Chapter = {
  id: string;
  chapterNumber: number;
  title: string;
  content: string;
  accessMode: AccessMode;
  coinPrice: number;
  inheritStoryHeatLevel: boolean;
  heatLevel: number | null;
  inheritStoryWarnings: boolean;
  contentWarningIds: string[];
  publicAvailableAt: Date | string | null;
  publicAccessModeAfterEarlyAccess: "free" | "paid" | null;
  publicCoinPrice: number | null;
  version: number;
};
type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

function localDateTime(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ProductionChapterEditor({ story, chapterNumber, initialChapter }: { story: Story; chapterNumber: number; initialChapter?: Chapter }) {
  const router = useRouter();
  const [chapterId, setChapterId] = useState(initialChapter?.id ?? "");
  const [version, setVersion] = useState(initialChapter?.version ?? 1);
  const [title, setTitle] = useState(initialChapter?.title ?? "");
  const [content, setContent] = useState(initialChapter?.content ?? "");
  const [accessMode, setAccessMode] = useState<AccessMode>(initialChapter?.accessMode ?? "free");
  const [coinPrice, setCoinPrice] = useState(initialChapter?.coinPrice || 3);
  const [inheritHeat, setInheritHeat] = useState(initialChapter?.inheritStoryHeatLevel ?? true);
  const [heatLevel, setHeatLevel] = useState(initialChapter?.heatLevel ?? story.heatLevel ?? 3);
  const [publicAvailableAt, setPublicAvailableAt] = useState(localDateTime(initialChapter?.publicAvailableAt ?? null));
  const [publicMode, setPublicMode] = useState<"free" | "paid">(initialChapter?.publicAccessModeAfterEarlyAccess ?? "free");
  const [publicCoinPrice, setPublicCoinPrice] = useState(initialChapter?.publicCoinPrice || 3);
  const [scheduleAt, setScheduleAt] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const hydrated = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const chapterIdRef = useRef(initialChapter?.id ?? "");
  const versionRef = useRef(initialChapter?.version ?? 1);
  const saveQueue = useRef<Promise<Chapter | null>>(Promise.resolve(null));
  const storageKey = `novelnow-studio-chapter-draft:${story.slug}:${initialChapter?.id ?? "new"}`;

  function body() {
    return {
      title: title.trim() || `EP.${chapterNumber}`,
      content,
      accessMode,
      coinPrice: accessMode === "paid" ? coinPrice : 0,
      inheritStoryHeatLevel: inheritHeat,
      heatLevel: inheritHeat ? null : heatLevel,
      inheritStoryWarnings: initialChapter?.inheritStoryWarnings ?? true,
      contentWarningIds: initialChapter?.contentWarningIds ?? [],
      memberAvailableAt: null,
      publicAvailableAt: accessMode === "early_access" && publicAvailableAt ? new Date(publicAvailableAt).toISOString() : null,
      publicAccessModeAfterEarlyAccess: accessMode === "early_access" ? publicMode : null,
      publicCoinPrice: accessMode === "early_access" && publicMode === "paid" ? publicCoinPrice : null,
    };
  }

  async function performSave() {
    if (!title.trim() && !content.trim()) return null;
    setSaveState("saving");
    setMessage("");
    try {
      const currentChapterId = chapterIdRef.current;
      const response = await fetch(currentChapterId ? `/api/studio/chapters/${currentChapterId}` : `/api/studio/stories/${story.id}/chapters`, {
        method: currentChapterId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentChapterId ? { expectedVersion: versionRef.current, ...body() } : { chapterNumber, ...body() }),
      });
      const result = await response.json() as { data?: Chapter; error?: { code?: string; message?: string } };
      if (response.status === 409 && result.error?.code === "VERSION_CONFLICT") {
        setSaveState("conflict");
        setMessage("ตอนนี้ถูกแก้ไขจากอุปกรณ์อื่น กรุณาโหลดข้อมูลล่าสุด");
        return null;
      }
      if (!response.ok || !result.data) throw new Error(result.error?.message || "บันทึกฉบับร่างไม่สำเร็จ");
      chapterIdRef.current = result.data.id;
      versionRef.current = result.data.version;
      setChapterId(result.data.id);
      setVersion(result.data.version);
      setSaveState("saved");
      localStorage.removeItem(storageKey);
      if (!currentChapterId) window.history.replaceState(null, "", `/studio/works/${story.slug}/chapters/${result.data.id}/edit`);
      return result.data;
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "บันทึกฉบับร่างไม่สำเร็จ");
      localStorage.setItem(storageKey, JSON.stringify({ title, content, savedAt: Date.now() }));
      return null;
    }
  }

  function persist() {
    const task = saveQueue.current.then(performSave, performSave);
    saveQueue.current = task;
    return task;
  }

  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    localStorage.setItem(storageKey, JSON.stringify({ title, content, savedAt: Date.now() }));
    window.clearTimeout(saveTimer.current);
    if (saveState !== "conflict") saveTimer.current = window.setTimeout(() => void persist(), 1_200);
    return () => window.clearTimeout(saveTimer.current);
  // Persist callback intentionally tracks the latest render values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  async function publish() {
    setPublishing(true);
    try {
      const saved = await persist();
      const id = saved?.id ?? chapterId;
      if (!id) return;
      const response = await fetch(scheduleAt ? `/api/studio/chapters/${id}/schedule` : `/api/studio/chapters/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: scheduleAt ? JSON.stringify({ scheduledAt: new Date(scheduleAt).toISOString() }) : undefined,
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message || "เผยแพร่ตอนไม่สำเร็จ");
      localStorage.removeItem(storageKey);
      router.push(`/studio/works/${story.slug}`);
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "เผยแพร่ตอนไม่สำเร็จ");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <Link href={`/studio/works/${story.slug}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"><ArrowLeft className="h-4 w-4" aria-hidden />{story.title}</Link>
        <div aria-live="polite" className="text-xs">
          {saveState === "saving" ? <span className="inline-flex items-center gap-1.5 text-(--text-secondary)"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />กำลังบันทึก</span> : null}
          {saveState === "saved" ? <span className="inline-flex items-center gap-1.5 text-[var(--success)]"><Check className="h-3.5 w-3.5" aria-hidden />บันทึกแล้ว · Version {version}</span> : null}
          {saveState === "error" || saveState === "conflict" ? <span role="alert" className="inline-flex items-center gap-1.5 text-destructive"><CircleAlert className="h-3.5 w-3.5" aria-hidden />{message}</span> : null}
        </div>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-[8px] border border-border bg-card p-4 sm:p-6">
          <p className="text-sm font-semibold text-brand-primary">EP.{chapterNumber}</p>
          <Input value={title} onChange={(event) => { setTitle(event.target.value); setSaveState("idle"); }} placeholder="ชื่อตอน" maxLength={500} className="mt-3 h-auto border-0 px-0 py-2 text-2xl font-semibold focus-visible:ring-0" />
          <Textarea value={content} onChange={(event) => { setContent(event.target.value); setSaveState("idle"); }} placeholder="เริ่มเขียนตอนของคุณ…" className="mt-4 min-h-[520px] resize-y border-0 px-0 text-base leading-8 focus-visible:ring-0" />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-(--text-tertiary)">{content.length.toLocaleString("th-TH")} ตัวอักษร</p><Button type="button" variant="outline" onClick={() => void persist()} disabled={saveState === "conflict"}><Save className="h-4 w-4" aria-hidden />บันทึก Draft</Button></div>
        </section>
        <aside className="grid content-start gap-4">
          <section className="rounded-[8px] border border-border bg-card p-4"><h2 className="font-semibold">การเข้าถึง</h2><div className="mt-4 grid gap-4"><Field label="ใครอ่านได้"><Select value={accessMode} onChange={(event) => setAccessMode(event.target.value as AccessMode)}><option value="free">อ่านฟรี</option><option value="paid">ใช้ Coins</option><option value="early_access">สมาชิกอ่านก่อน</option><option value="members_only">สมาชิกเท่านั้น</option></Select></Field>{accessMode === "paid" ? <Field label="ราคา Coins"><Input type="number" min={1} max={1_000_000} value={coinPrice} onChange={(event) => setCoinPrice(Number(event.target.value))} /></Field> : null}{accessMode === "early_access" ? <><Field label="เปิดให้ Public เมื่อ"><Input type="datetime-local" value={publicAvailableAt} onChange={(event) => setPublicAvailableAt(event.target.value)} /></Field><Field label="หลัง Early Access"><Select value={publicMode} onChange={(event) => setPublicMode(event.target.value as "free" | "paid")}><option value="free">อ่านฟรี</option><option value="paid">ใช้ Coins</option></Select></Field>{publicMode === "paid" ? <Field label="ราคา Public"><Input type="number" min={1} value={publicCoinPrice} onChange={(event) => setPublicCoinPrice(Number(event.target.value))} /></Field> : null}</> : null}</div></section>
          <section className="rounded-[8px] border border-border bg-card p-4"><h2 className="font-semibold">เนื้อหา 20+</h2><label className="mt-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={inheritHeat} onChange={(event) => setInheritHeat(event.target.checked)} />ใช้ Heat ระดับ {story.heatLevel ?? 3} ตามเรื่อง</label>{!inheritHeat ? <Input type="number" min={1} max={5} value={heatLevel} onChange={(event) => setHeatLevel(Number(event.target.value))} /> : null}</section>
          <section className="rounded-[8px] border border-border bg-card p-4"><h2 className="font-semibold">เผยแพร่</h2><Field label="ตั้งเวลา (ไม่บังคับ)"><Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} /></Field><Button type="button" className="mt-4 w-full" onClick={() => void publish()} loading={publishing} disabled={!title.trim() || !content.trim() || saveState === "conflict"}>{scheduleAt ? <Clock3 className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}{scheduleAt ? "ตั้งเวลาเผยแพร่" : "เผยแพร่ตอน"}</Button></section>
        </aside>
      </div>
    </div>
  );
}
