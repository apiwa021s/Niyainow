"use client";

import { Check, CircleAlert, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form-controls";

type Post = { id: string; content: string; visibility: "public" | "followers" | "members"; status: "draft" | "published" | "archived"; publishedAt: Date | string | null };

export function WriterPostManager({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Post["visibility"]>("public");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function create(status: "draft" | "published") {
    if (!content.trim()) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/studio/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: content.trim(), imageKey: null, visibility, status }) });
      const payload = await response.json() as { data?: Post; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "บันทึกโพสต์ไม่สำเร็จ");
      setPosts((current) => [payload.data!, ...current]); setContent(""); setMessage(status === "published" ? "เผยแพร่โพสต์แล้ว" : "บันทึกฉบับร่างแล้ว");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "บันทึกโพสต์ไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/studio/posts/${id}`, { method: "DELETE" });
    if (response.ok) setPosts((current) => current.filter((post) => post.id !== id));
  }

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section className="rounded-[8px] border border-border bg-card p-4 sm:p-5">
      <h2 className="font-semibold">เขียนโพสต์ใหม่</h2>
      <div className="mt-4 grid gap-4">
        <Field label="ข้อความ"><Textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={10_000} rows={7} placeholder="อัปเดตงานเขียน ข่าวตอนใหม่ หรือเบื้องหลังสำหรับแฟนของคุณ" /></Field>
        <Field label="ใครเห็นโพสต์นี้"><Select value={visibility} onChange={(event) => setVisibility(event.target.value as Post["visibility"])}><option value="public">ทุกคน</option><option value="followers">ผู้ติดตาม</option><option value="members">สมาชิกเท่านั้น</option></Select></Field>
        <div aria-live="polite" className="min-h-5 text-sm">{message ? <span className="inline-flex items-center gap-1.5 text-[var(--success)]"><Check className="h-4 w-4" aria-hidden />{message}</span> : null}{error ? <span role="alert" className="inline-flex items-center gap-1.5 text-destructive"><CircleAlert className="h-4 w-4" aria-hidden />{error}</span> : null}</div>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => void create("draft")} disabled={!content.trim() || saving}><Save className="h-4 w-4" aria-hidden />บันทึกร่าง</Button><Button onClick={() => void create("published")} loading={saving} disabled={!content.trim()}><Plus className="h-4 w-4" aria-hidden />เผยแพร่โพสต์</Button></div>
      </div>
    </section>
    <section className="rounded-[8px] border border-border bg-card p-4 sm:p-5"><h2 className="font-semibold">โพสต์ของคุณ</h2><div className="mt-4 grid gap-3">{posts.length === 0 ? <p className="text-sm text-(--text-secondary)">ยังไม่มีโพสต์ เริ่มแชร์ความคืบหน้ากับแฟนได้จากแบบฟอร์มนี้</p> : posts.map((post) => <article key={post.id} className="rounded-[6px] border border-border p-3"><div className="flex items-start justify-between gap-2"><p className="whitespace-pre-line text-sm leading-6">{post.content}</p><button type="button" onClick={() => void remove(post.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] text-(--text-tertiary) hover:bg-destructive/10 hover:text-destructive" aria-label="ลบโพสต์"><Trash2 className="h-4 w-4" /></button></div><p className="mt-2 text-xs text-(--text-tertiary)">{post.status === "published" ? "เผยแพร่แล้ว" : "ฉบับร่าง"} · {post.visibility === "public" ? "ทุกคน" : post.visibility === "followers" ? "ผู้ติดตาม" : "สมาชิก"}</p></article>)}</div></section>
  </div>;
}
