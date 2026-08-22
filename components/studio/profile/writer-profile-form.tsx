"use client";

import { Check, CircleAlert, ExternalLink, Loader2, Save, UserRoundPen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarKey: string | null;
  coverKey: string | null;
  featuredNovelId: string | null;
};
type Option = { id: string; name: string; slug: string };
type StoryOption = { id: string; title: string; slug: string };
export type WriterProfileEditorData = {
  profile: Profile | null;
  selectedTags: Option[];
  availableTags: Option[];
  ownedStories: StoryOption[];
};
type SaveState = "idle" | "saving" | "saved" | "error";

export function WriterProfileForm({ initialData }: { initialData: WriterProfileEditorData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState(initialData.profile);
  const [displayName, setDisplayName] = useState(initialData.profile?.displayName ?? "");
  const [username, setUsername] = useState(initialData.profile?.username ?? "");
  const [bio, setBio] = useState(initialData.profile?.bio ?? "");
  const [featuredStoryId, setFeaturedStoryId] = useState(initialData.profile?.featuredNovelId ?? "");
  const [tagIds, setTagIds] = useState(initialData.selectedTags.map((tag) => tag.id));
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const normalizedUsername = username.trim().toLowerCase().replace(/^@/u, "");
  const usernameValid = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(normalizedUsername)
    && normalizedUsername.length >= 3
    && normalizedUsername.length <= 80;
  const valid = displayName.trim().length > 0 && displayName.trim().length <= 160 && usernameValid && bio.length <= 2_000;

  function toggleTag(id: string) {
    setState("idle");
    setTagIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 5 ? [...current, id] : current);
  }

  async function save() {
    if (!valid || state === "saving") return;
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/studio/profile", {
        method: profile ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          displayName: displayName.trim(),
          bio: bio.trim() || null,
          avatarKey: profile?.avatarKey ?? null,
          coverKey: profile?.coverKey ?? null,
          featuredStoryId: featuredStoryId || null,
          tagIds,
        }),
      });
      const payload = await response.json() as { data?: Profile; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "บันทึกโปรไฟล์ไม่สำเร็จ");
      const wasExisting = Boolean(profile);
      setProfile(payload.data);
      setState("saved");
      setMessage(wasExisting ? "บันทึกโปรไฟล์แล้ว" : "สร้างโปรไฟล์นักเขียนแล้ว");
      startTransition(() => router.refresh());
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[8px] border border-border bg-card p-4 sm:p-6">
        <div className="mb-6 flex items-start gap-3 border-b border-border pb-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]">
            <UserRoundPen className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{profile ? "ข้อมูลสาธารณะ" : "สร้างตัวตนนักเขียน"}</h2>
            <p className="mt-1 text-sm leading-6 text-(--text-secondary)">ชื่อนี้จะแสดงบนหน้าผลงาน โปรไฟล์ และผลการค้นหา คุณแก้ไขภายหลังได้</p>
          </div>
        </div>

        <div className="grid gap-5">
          <Field label="นามปากกา" error={!displayName.trim() && displayName.length > 0 ? "กรุณาระบุนามปากกา" : undefined}>
            <Input id="writer-display-name" value={displayName} maxLength={160} autoComplete="name" onChange={(event) => { setDisplayName(event.target.value); setState("idle"); }} />
          </Field>

          <Field label="Username" hint="ใช้ใน URL /@username · ตัวพิมพ์เล็ก ตัวเลข จุด ขีดกลาง หรือขีดล่าง" error={username.length > 0 && !usernameValid ? "Username ต้องยาว 3–80 ตัวและเป็นรูปแบบ URL-safe" : undefined}>
            <div className="flex overflow-hidden rounded-[6px] border border-input bg-background focus-within:ring-2 focus-within:ring-ring/30">
              <span className="grid min-h-11 place-items-center border-r border-border bg-muted px-3 text-sm text-muted-foreground">@</span>
              <Input id="writer-username" value={username} maxLength={80} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="border-0 focus-visible:ring-0" onChange={(event) => { setUsername(event.target.value.toLowerCase()); setState("idle"); }} invalid={username.length > 0 && !usernameValid} />
            </div>
          </Field>

          <Field label="แนะนำตัว" hint={`${bio.length.toLocaleString("th-TH")} / 2,000 ตัวอักษร`}>
            <Textarea id="writer-bio" value={bio} maxLength={2_000} rows={7} placeholder="เล่าแนวที่คุณเขียน ตารางอัปเดต หรือสิ่งที่อยากให้คนอ่านรู้จัก" onChange={(event) => { setBio(event.target.value); setState("idle"); }} />
          </Field>

          <fieldset>
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-semibold">แนวที่เขียนประจำ</legend>
              <span className="text-xs tabular-nums text-(--text-tertiary)">{tagIds.length} / 5</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-(--text-secondary)">เลือกจากแท็กกลางของ NovelNow เพื่อให้คนอ่านค้นพบคุณได้ตรงขึ้น</p>
            {initialData.availableTags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {initialData.availableTags.map((tag) => {
                  const selected = tagIds.includes(tag.id);
                  return (
                    <button key={tag.id} type="button" aria-pressed={selected} disabled={!selected && tagIds.length >= 5} onClick={() => toggleTag(tag.id)} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-[6px] border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40", selected ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]" : "border-border bg-background text-(--text-secondary) hover:border-[var(--brand-primary)]/40 hover:text-foreground") }>
                      {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}{tag.name}
                    </button>
                  );
                })}
              </div>
            ) : <p className="mt-3 rounded-[6px] border border-dashed border-border p-3 text-sm text-(--text-secondary)">ยังไม่มีแท็กที่เปิดใช้งาน คุณสามารถข้ามส่วนนี้ได้</p>}
          </fieldset>

          {profile ? (
            <Field label="เรื่องแนะนำ" hint="แสดงเด่นบนโปรไฟล์สาธารณะของคุณ">
              <Select id="featured-story" value={featuredStoryId} onChange={(event) => { setFeaturedStoryId(event.target.value); setState("idle"); }}>
                <option value="">ยังไม่เลือกเรื่องแนะนำ</option>
                {initialData.ownedStories.map((story) => <option key={story.id} value={story.id}>{story.title}</option>)}
              </Select>
            </Field>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className="min-h-6 text-sm">
              {state === "saving" ? <span className="inline-flex items-center gap-2 text-(--text-secondary)"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />กำลังบันทึก…</span> : null}
              {state === "saved" ? <span className="inline-flex items-center gap-2 text-[var(--success)]"><Check className="h-4 w-4" aria-hidden />{message}</span> : null}
              {state === "error" ? <span role="alert" className="inline-flex items-center gap-2 text-destructive"><CircleAlert className="h-4 w-4" aria-hidden />{message}</span> : null}
            </div>
            <Button type="button" onClick={save} disabled={!valid || isPending} loading={state === "saving"} className="sm:min-w-40">
              <Save className="h-4 w-4" aria-hidden />{profile ? "บันทึกโปรไฟล์" : "สร้างโปรไฟล์นักเขียน"}
            </Button>
          </div>
        </div>
      </section>

      <aside className="rounded-[8px] border border-border bg-card p-4 sm:p-5 xl:sticky xl:top-4 xl:self-start">
        <p className="editorial-kicker">PUBLIC PREVIEW</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[6px] bg-[var(--brand-primary)]/12 text-lg font-semibold text-[var(--brand-emphasis)]">{(displayName.trim() || "N").charAt(0).toUpperCase()}</div>
          <div className="min-w-0"><p className="truncate font-semibold">{displayName.trim() || "นามปากกาของคุณ"}</p><p className="truncate text-sm text-(--text-secondary)">@{normalizedUsername || "username"}</p></div>
        </div>
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-(--text-secondary)">{bio.trim() || "Bio ของคุณจะแสดงตรงนี้ เพื่อให้คนอ่านรู้จักแนวงานและตารางอัปเดต"}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">{initialData.availableTags.filter((tag) => tagIds.includes(tag.id)).map((tag) => <span key={tag.id} className="rounded-[4px] bg-muted px-2 py-1 text-xs text-(--text-secondary)">{tag.name}</span>)}</div>
        {profile ? <Link href={`/creators/${profile.username}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--brand-emphasis)] hover:underline">ดูโปรไฟล์สาธารณะ<ExternalLink className="h-4 w-4" aria-hidden /></Link> : <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-(--text-tertiary)">โปรไฟล์สาธารณะจะเปิดหลังบันทึกข้อมูลครั้งแรก</p>}
      </aside>
    </div>
  );
}
