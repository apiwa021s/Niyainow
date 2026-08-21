"use client";

import {
  ArrowRight,
  Bell,
  BookMarked,
  Check,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleDot,
  Coins,
  Crown,
  Ellipsis,
  Eye,
  FileText,
  Flame,
  Heart,
  ImagePlus,
  MessageCircle,
  PenLine,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import {
  compact,
  defaultMembership,
  fanGrowth,
  fanKpis,
  fanPreferences,
  fanSource,
  fanSourceInsight,
  intensityPreference,
  latestFans,
  membershipBenefits,
  membershipPlans,
  money,
  notificationItems,
  postsSeed,
  stories,
  storySorts,
  whole,
  writerGenres,
  writerProfile,
  type FanFilter,
  type PostVisibility,
  type StoryState,
} from "@/components/studio/writer-studio-mock";
import { EmptyState, StatTile, StatusPill, StudioPanel, StudioRowLink } from "@/components/studio/studio-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const sectionCard = "rounded-xl border border-border bg-card";

export function StudioSidebar() {
  return null;
}

export function StudioHeader() {
  return null;
}

export function ResumeWritingCard({ compactMode = false }: { compactMode?: boolean }) {
  return (
    <section className={cn(sectionCard, compactMode ? "p-4" : "p-5")}>
      <p className="text-xs font-semibold text-(--text-tertiary)">เขียนต่อจากที่ค้างไว้</p>
      <p className="mt-1 text-base font-semibold">EP.39</p>
      <p className="text-sm text-(--text-secondary)">สิ่งที่เขาไม่ควรพูด</p>
      <p className="mt-1 text-xs text-(--text-tertiary) tabular-nums">2,842 คำ</p>
      <ButtonLink href="/studio/works/reborn-as-a-warlord/chapters/2668/edit" variant="outline" className="mt-4 w-full sm:w-auto">
        เขียนต่อ
        <ArrowRight aria-hidden className="h-4 w-4" />
      </ButtonLink>
    </section>
  );
}

export function QuickWriteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="เขียนตอนใหม่" description="เลือกเรื่องที่อยากเขียนต่อ หรือเริ่มเรื่องใหม่" size="sm">
      <div className="grid gap-2.5">
        {stories
          .filter((story) => story.state === "writing")
          .map((story) => (
            <Link
              key={story.slug}
              href={`/studio/works/${story.slug}/chapters/new`}
              onClick={onClose}
              className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-[var(--brand-emphasis)] hover:bg-muted/50"
            >
              <p className="font-semibold">{story.title}</p>
              <p className="mt-0.5 text-xs text-(--text-secondary)">ล่าสุด {story.latestEp}</p>
            </Link>
          ))}
        <ButtonLink href="/studio/works/new" variant="outline" onClick={onClose}>
          <Plus className="h-4 w-4" />
          สร้างเรื่องใหม่
        </ButtonLink>
      </div>
    </Modal>
  );
}

function TinyBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="relative mt-3 flex h-28 items-end gap-1.5 border-b border-border/70 pb-px">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex-1 rounded-t bg-[linear-gradient(180deg,#ff3b95_0%,#e830a5_48%,#8b2c91_100%)]" style={{ height: `${Math.max((value / max) * 100, 4)}%` }} />
      ))}
    </div>
  );
}

export function FansOverview() {
  const cards = [
    { label: "ผู้ติดตามทั้งหมด", value: whole.format(fanKpis.totalFollowers), sub: "" },
    { label: "ผู้ติดตามใหม่", value: `+${whole.format(fanKpis.newFollowersThisMonth)}`, sub: "เดือนนี้" },
    { label: "สมาชิก", value: whole.format(fanKpis.members), sub: "" },
    { label: "ผู้อ่านที่กลับมาอ่าน", value: `${fanKpis.returnRate}%`, sub: "" },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((item) => (
        <article key={item.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-(--text-secondary)">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{item.value}</p>
          {item.sub ? <p className="text-xs text-(--text-tertiary)">{item.sub}</p> : null}
        </article>
      ))}
    </section>
  );
}

export function FanGrowthChart() {
  const [metric, setMetric] = useState<"followers" | "members">("followers");
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const values = fanGrowth[metric][range];

  return (
    <section className={sectionCard}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-semibold">การเติบโตของแฟน</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <div className="flex rounded-full border border-border bg-muted/30 p-1">
            {["followers", "members"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMetric(item as "followers" | "members")}
                className={cn(
                  "rounded-full px-3 py-1.5 font-semibold",
                  metric === item ? "bg-[var(--brand-primary)] text-white" : "text-(--text-secondary)",
                )}
              >
                {item === "followers" ? "ผู้ติดตาม" : "สมาชิก"}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-border bg-muted/30 p-1">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRange(days as 7 | 30 | 90)}
                className={cn("rounded-full px-3 py-1.5 font-semibold", range === days ? "bg-accent-subtle text-[var(--brand-emphasis)]" : "text-(--text-secondary)")}
              >
                {days} วัน
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5">
        <TinyBars values={values} />
      </div>
    </section>
  );
}

export function FanSourceList() {
  const max = Math.max(...fanSource.map((item) => item.value));
  return (
    <section className={sectionCard}>
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <h2 className="font-semibold">คนอ่านพบคุณจากไหน?</h2>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:px-5">
        {fanSource.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className="tabular-nums text-(--text-secondary)">{item.value}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#FF3B95_0%,#E830A5_48%,#8B2C91_100%)]" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
        <p className="flex items-start gap-2 rounded-lg bg-muted/35 p-3 text-sm leading-7 text-(--text-secondary)">
          <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" />
          {fanSourceInsight}
        </p>
      </div>
    </section>
  );
}

export function FanPreferenceInsights() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className={sectionCard}>
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-semibold">แฟนของคุณชอบอะไร?</h2>
        </div>
        <ul className="grid gap-3 px-4 py-4 sm:px-5">
          {fanPreferences.map((item) => (
            <li key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="tabular-nums text-(--text-secondary)">{item.value}%</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${item.value}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={sectionCard}>
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-semibold">ระดับความเข้มข้นที่นิยม</h2>
        </div>
        <ul className="grid gap-3 px-4 py-4 sm:px-5">
          {intensityPreference.map((item) => (
            <li key={item.level} className="flex items-center justify-between rounded-lg bg-muted/35 px-3 py-3">
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Flame aria-hidden className="h-4 w-4 text-brand-primary" />
                ระดับ {item.level}
              </span>
              <span className="text-sm font-semibold tabular-nums">{item.value}%</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function FanRow({ fan }: { fan: (typeof latestFans)[number] }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-muted/35 text-sm font-semibold">
          {fan.initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {fan.name}
            {fan.isMember ? <Crown aria-hidden className="ml-1 inline h-3.5 w-3.5 align-text-top text-[var(--brand-emphasis)]" /> : null}
          </p>
          {fan.isMember ? (
            <p className="text-xs text-(--text-secondary)">สมาชิกมา {fan.memberMonths} เดือน · ติดตามมา {fan.monthsFollow >= 12 ? "1 ปี" : `${fan.monthsFollow} เดือน`}</p>
          ) : (
            <p className="text-xs text-(--text-secondary)">ติดตามมา {fan.monthsFollow} เดือน · อ่านเรื่องของคุณ {fan.storiesRead} เรื่อง</p>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm">{fan.isMember ? "สมาชิก" : "ติดตาม"}</Button>
    </li>
  );
}

export function FanList({ empty = false }: { empty?: boolean }) {
  const [filter, setFilter] = useState<FanFilter>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (empty) return [];
    const term = query.trim().toLowerCase();
    return latestFans.filter((fan) => {
      if (filter === "followers" && fan.isMember) return false;
      if (filter === "members" && !fan.isMember) return false;
      if (!term) return true;
      return fan.name.toLowerCase().includes(term);
    });
  }, [empty, filter, query]);

  return (
    <section className={sectionCard}>
      <div className="grid gap-3 border-b border-border px-4 py-4 sm:px-5 lg:flex lg:items-end lg:justify-between">
        <div>
          <h2 className="font-semibold">แฟนล่าสุด</h2>
        </div>
        <div className="grid gap-2 sm:flex sm:items-center sm:gap-3">
          <div className="flex rounded-full border border-border bg-muted/25 p-1 text-xs">
            {[
              ["all", "ทั้งหมด"],
              ["followers", "ผู้ติดตาม"],
              ["members", "สมาชิก"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id as FanFilter)}
                className={cn("rounded-full px-3 py-1.5 font-semibold", filter === id ? "bg-[var(--brand-primary)] text-white" : "text-(--text-secondary)")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้..."
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm placeholder:text-(--text-tertiary) sm:w-64"
            />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="แฟนคนแรกกำลังรอพบเรื่องของคุณ"
          description="เผยแพร่ตอนใหม่และแชร์ผลงาน เพื่อเริ่มสร้างฐานคนอ่านของคุณ"
          action={<ButtonLink href="/studio/stories" variant="outline">ดูผลงานของฉัน</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((fan) => (
            <FanRow key={fan.id} fan={fan} />
          ))}
        </ul>
      )}
    </section>
  );
}

function visibilityLabel(value: PostVisibility) {
  if (value === "followers") return "ผู้ติดตาม";
  if (value === "members") return "สมาชิกเท่านั้น";
  return "ทุกคน";
}

export function PostVisibilitySelector({ value, onChange }: { value: PostVisibility; onChange: (value: PostVisibility) => void }) {
  const options: Array<{ id: PostVisibility; title: string; description: string }> = [
    { id: "public", title: "ทุกคน", description: "ทุกคนที่เข้ามาโปรไฟล์สามารถเห็นได้" },
    { id: "followers", title: "ผู้ติดตาม", description: "เฉพาะคนที่ติดตามคุณ" },
    { id: "members", title: "สมาชิกเท่านั้น", description: "เฉพาะสมาชิกของคุณ" },
  ];
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-lg border px-3 py-3 text-left transition-colors",
            value === option.id ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:bg-muted/40",
          )}
        >
          <p className="text-sm font-semibold">{option.title}</p>
          <p className="mt-0.5 text-xs text-(--text-secondary)">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

export function CreatePostComposer({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { text: string; visibility: PostVisibility; image: boolean }) => void;
}) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [imageAttached, setImageAttached] = useState(false);

  function submit() {
    onCreate({ text: text.trim(), visibility, image: imageAttached });
    setText("");
    setVisibility("public");
    setImageAttached(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="สร้างโพสต์"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={!text.trim()}>
            โพสต์
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-muted/40 font-semibold">{writerProfile.avatar}</span>
          <span className="font-semibold">{writerProfile.name}</span>
        </div>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="เขียนอะไรถึงคนอ่านของคุณ..."
          className="min-h-32"
        />

        <div className="rounded-lg border border-border p-3">
          {imageAttached ? (
            <div className="grid gap-3">
              <div className="grid h-32 place-items-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-(--text-secondary)">
                IMAGE PREVIEW
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setImageAttached(true)}>
                  เปลี่ยนรูป
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setImageAttached(false)}>
                  ลบรูป
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setImageAttached(true)}>
              <ImagePlus className="h-4 w-4" />
              เพิ่มรูป
            </Button>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">ใครเห็นโพสต์นี้?</p>
          <PostVisibilitySelector value={visibility} onChange={setVisibility} />
        </div>
      </div>
    </Modal>
  );
}

export function WriterPostCard({
  post,
  onView,
}: {
  post: (typeof postsSeed)[number] & { id: string; title: string; body: string; status: "published" | "draft" | "scheduled"; likes: number; comments: number; age: string; visibility: PostVisibility; image: boolean };
  onView: () => void;
}) {
  return (
    <article className={sectionCard + " p-4 sm:p-5"}>
      <p className="text-xs text-(--text-tertiary)">
        {post.status === "published" ? "เผยแพร่แล้ว" : post.status === "draft" ? "ฉบับร่าง" : "ตั้งเวลา"} • {post.age}
      </p>
      <h3 className="mt-2 font-semibold">{post.title}</h3>
      <p className="mt-1 text-sm text-(--text-secondary)">{post.body}</p>
      {post.image ? (
        <div className="mt-3 grid h-36 place-items-center rounded-lg border border-border bg-muted/30 text-xs text-(--text-tertiary)">IMAGE</div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-(--text-secondary)">
          <span className="inline-flex items-center gap-1"><Heart aria-hidden className="h-4 w-4" /> {whole.format(post.likes)}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle aria-hidden className="h-4 w-4" /> {whole.format(post.comments)}</span>
        </div>
        <p className="text-xs text-(--text-tertiary)">{visibilityLabel(post.visibility)}เห็นโพสต์นี้</p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onView}>
          ดูโพสต์
        </Button>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-lg text-(--text-secondary) hover:bg-muted">
          <Ellipsis className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export function WriterPostList() {
  const [tab, setTab] = useState<"all" | "published" | "draft" | "scheduled">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [items, setItems] = useState(postsSeed);
  const { toast } = useToast();

  const visible = items.filter((item) => (tab === "all" ? true : item.status === tab));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-full border border-border bg-muted/25 p-1">
          {[
            ["all", "ทั้งหมด"],
            ["published", "เผยแพร่แล้ว"],
            ["draft", "ฉบับร่าง"],
            ["scheduled", "ตั้งเวลา"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as "all" | "published" | "draft" | "scheduled")}
              className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", tab === id ? "bg-[var(--brand-primary)] text-white" : "text-(--text-secondary)")}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" />
          สร้างโพสต์
        </Button>
      </div>

      {visible.length === 0 ? (
        <section className={sectionCard}>
          <EmptyState
            icon={MessageCircle}
            title="ยังไม่มีโพสต์"
            description="ลองบอกแฟนว่าคุณกำลังเขียนอะไรอยู่ หรือแชร์ข่าวตอนใหม่ที่กำลังจะมา ✦"
            action={<Button onClick={() => setComposerOpen(true)}>สร้างโพสต์แรก</Button>}
          />
        </section>
      ) : (
        <div className="grid gap-3">
          {visible.map((post) => (
            <WriterPostCard
              key={post.id}
              post={post}
              onView={() => {
                toast({ tone: "success", message: "โพสต์เรียบร้อยแล้ว", action: { label: "ดูโพสต์", onClick: () => {} } });
              }}
            />
          ))}
        </div>
      )}

      <CreatePostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreate={(input) => {
          const created = {
            id: `p-${Date.now()}`,
            title: input.text.split("\n")[0]?.slice(0, 40) || "โพสต์ใหม่",
            body: input.text,
            status: "published" as const,
            age: "เมื่อสักครู่",
            likes: 0,
            comments: 0,
            visibility: input.visibility,
            image: input.image,
          };
          setItems((current) => [created, ...current]);
          toast({
            tone: "success",
            message: "โพสต์เรียบร้อยแล้ว",
            action: { label: "เขียนต่อ", onClick: () => {} },
          });
        }}
      />
    </div>
  );
}

export function MembershipBenefitCard({
  benefit,
  selected,
  onToggle,
}: {
  benefit: (typeof membershipBenefits)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        selected ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:bg-muted/35",
      )}
    >
      <p className="inline-flex items-center gap-1.5 font-semibold">
        {selected ? <Check aria-hidden className="h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" /> : null}
        {benefit.title}
      </p>
      <p className="mt-1 text-xs leading-6 text-(--text-secondary)">{benefit.description}</p>
    </button>
  );
}

export function MembershipPreviewCard({
  name,
  description,
  price,
  benefits,
}: {
  name: string;
  description: string;
  price: number;
  benefits: string[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-[linear-gradient(160deg,rgba(255,47,142,0.12),rgba(232,50,166,0.06),rgba(146,45,155,0.08))] p-5">
      <p className="inline-flex items-center gap-1.5 text-lg font-semibold">
        <Crown aria-hidden className="h-4.5 w-4.5 text-[var(--brand-emphasis)]" />
        {name}
      </p>
      <p className="mt-2 text-sm text-(--text-secondary)">{description.split("\n")[0]}</p>
      <p className="mt-3 text-xl font-semibold tabular-nums">฿{price} <span className="text-sm font-medium text-(--text-secondary)">/ เดือน</span></p>
      <ul className="mt-3 grid gap-1.5 text-sm">
        {benefits.map((item) => (
          <li key={item} className="inline-flex items-center gap-1.5">
            <Check aria-hidden className="h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" />
            {item}
          </li>
        ))}
      </ul>
      <Button className="mt-4 w-full">
        <Crown aria-hidden className="h-4 w-4" />
        เป็นสมาชิก
      </Button>
    </section>
  );
}

export function MembershipEmptyState({ onStart }: { onStart: () => void }) {
  return (
    <section className={sectionCard + " overflow-hidden"}>
      <div className="border-b border-border bg-[linear-gradient(150deg,rgba(255,59,149,0.18),rgba(232,48,165,0.06),rgba(139,44,145,0.1))] px-5 py-8 sm:px-8">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-subtle text-[var(--brand-emphasis)]">
          <Crown aria-hidden className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-2xl font-semibold">สร้างพื้นที่พิเศษสำหรับแฟนของคุณ</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-(--text-secondary)">ให้คนอ่านที่อยากสนับสนุนคุณมากขึ้นได้รับสิทธิพิเศษ เช่น อ่านตอนใหม่ก่อนใคร ตอนพิเศษ และโพสต์สำหรับสมาชิก</p>
        <Button className="mt-5" onClick={onStart}>เปิด Membership</Button>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["อ่านก่อน", "ให้สมาชิกอ่านตอนใหม่ก่อนคนอื่น"],
          ["ตอนพิเศษ", "สร้าง Bonus Chapter สำหรับสมาชิก"],
          ["โพสต์พิเศษ", "พูดคุยและแชร์เบื้องหลัง"],
          ["Member Badge", "แสดง Badge เล็ก ๆ ให้สมาชิก"],
        ].map(([title, desc]) => (
          <article key={title} className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-6 text-(--text-secondary)">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MembershipSetupWizard({ onEnable }: { onEnable: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(defaultMembership.name);
  const [description, setDescription] = useState(defaultMembership.description);
  const [price, setPrice] = useState(defaultMembership.price);
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>(defaultMembership.selectedBenefits);

  const selectedBenefitLabels = membershipBenefits
    .filter((item) => selectedBenefits.includes(item.id))
    .map((item) => item.title.replace("สำหรับสมาชิก", ""));

  return (
    <section className={sectionCard + " p-4 sm:p-5"}>
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
        {["01 Membership ของคุณ", "02 สิทธิพิเศษ", "03 Preview"].map((label, index) => (
          <span key={label} className={cn("rounded-full border px-3 py-1.5", step === index + 1 ? "border-transparent bg-[var(--brand-primary)] text-white" : "border-border text-(--text-secondary)")}>
            {label}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <div className="grid gap-4">
          <Field label="Membership ของคุณชื่ออะไร?">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="คำอธิบาย">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-28" />
          </Field>
          <Field label="ราคา / เดือน">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {membershipPlans.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setPrice(plan)}
                  className={cn("flex items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-semibold", price === plan ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card")}
                >
                  ฿{plan}
                  {price === plan ? <Check aria-hidden className="h-3.5 w-3.5" /> : null}
                </button>
              ))}
            </div>
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-3">
          <h3 className="font-semibold">สมาชิกจะได้รับอะไรบ้าง?</h3>
          {membershipBenefits.map((benefit) => (
            <MembershipBenefitCard
              key={benefit.id}
              benefit={benefit}
              selected={selectedBenefits.includes(benefit.id)}
              onToggle={() => {
                setSelectedBenefits((current) =>
                  current.includes(benefit.id) ? current.filter((item) => item !== benefit.id) : [...current, benefit.id],
                );
              }}
            />
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <MembershipPreviewCard name={name} description={description} price={price} benefits={selectedBenefitLabels} />
          <div className="grid content-start gap-3">
            <Button onClick={onEnable}>เปิด Membership</Button>
            <Button variant="outline" onClick={() => setStep(2)}>กลับไปแก้สิทธิพิเศษ</Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex justify-between gap-2">
        <Button variant="ghost" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}>ย้อนกลับ</Button>
        {step < 3 ? <Button onClick={() => setStep((value) => Math.min(3, value + 1))}>ถัดไป</Button> : null}
      </div>
    </section>
  );
}

export function EarlyAccessSettingsModal({
  open,
  value,
  policy,
  onClose,
  onSave,
}: {
  open: boolean;
  value: number;
  policy: "normal" | "free";
  onClose: () => void;
  onSave: (input: { chapters: number; policy: "normal" | "free" }) => void;
}) {
  const [chapters, setChapters] = useState(value);
  const [nextPolicy, setNextPolicy] = useState(policy);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Early Access"
      description="ให้สมาชิกอ่านก่อนกี่ตอน?"
      footer={<Button onClick={() => onSave({ chapters, policy: nextPolicy })}>บันทึก</Button>}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          {[1, 2, 3, 5].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setChapters(item)}
              className={cn("flex items-center gap-2 rounded-lg border px-3 py-3 text-left", chapters === item ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card")}
            >
              {chapters === item ? (
                <CircleDot aria-hidden className="h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" />
              ) : (
                <Circle aria-hidden className="h-4 w-4 shrink-0 text-(--text-tertiary)" />
              )}
              {item} ตอน
            </button>
          ))}
        </div>
        <div className="h-px bg-border" />
        <div className="grid gap-2">
          <p className="text-sm font-semibold">เมื่อ Early Access สิ้นสุด</p>
          <button
            type="button"
            onClick={() => setNextPolicy("normal")}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-3 text-left", nextPolicy === "normal" ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card")}
          >
            {nextPolicy === "normal" ? (
              <CircleDot aria-hidden className="h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" />
            ) : (
              <Circle aria-hidden className="h-4 w-4 shrink-0 text-(--text-tertiary)" />
            )}
            ใช้ราคาปกติของตอน
          </button>
          <button
            type="button"
            onClick={() => setNextPolicy("free")}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-3 text-left", nextPolicy === "free" ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card")}
          >
            {nextPolicy === "free" ? (
              <CircleDot aria-hidden className="h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" />
            ) : (
              <Circle aria-hidden className="h-4 w-4 shrink-0 text-(--text-tertiary)" />
            )}
            เปิดให้อ่านฟรี
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function EarlyAccessCard({
  value,
  onEdit,
}: {
  value: number;
  onEdit: () => void;
}) {
  return (
    <section className={sectionCard + " p-4 sm:p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Early Access</p>
          <p className="mt-2 text-lg font-semibold">ให้สมาชิกอ่านก่อน</p>
          <p className="mt-1 text-sm text-(--text-secondary)">สมาชิกสามารถอ่านก่อน {value} ตอน</p>
          <div className="mt-3 grid gap-1 text-sm">
            <p><span className="text-(--text-tertiary)">Public ล่าสุด</span> EP.20</p>
            <p><span className="text-(--text-tertiary)">สมาชิกอ่านได้ถึง</span> EP.23</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>แก้ไข</Button>
      </div>
    </section>
  );
}

export function MembershipOverview() {
  const [earlyAccess, setEarlyAccess] = useState(defaultMembership.earlyAccessChapters);
  const [policy, setPolicy] = useState(defaultMembership.earlyAccessPolicy);
  const [modalOpen, setModalOpen] = useState(false);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const values = range === 7 ? defaultMembership.growth7 : range === 30 ? defaultMembership.growth30 : defaultMembership.growth90;

  return (
    <div className="grid gap-4">
      <section className={sectionCard + " p-4 sm:p-5"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-(--text-secondary)">Membership</p>
            <h2 className="mt-1 text-xl font-semibold">{defaultMembership.name}</h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-emerald-500">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              เปิดใช้งาน
            </p>
            <p className="mt-2 text-sm text-(--text-secondary)">฿{defaultMembership.price} / เดือน</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["สมาชิกปัจจุบัน", whole.format(defaultMembership.currentMembers)],
            ["สมาชิกใหม่เดือนนี้", `+${whole.format(defaultMembership.newMembersMonth)}`],
            ["รายได้เดือนนี้", `฿${money.format(defaultMembership.monthlyRevenue)}`],
            ["อัตราต่ออายุ", `${defaultMembership.renewalRate}%`],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-border bg-card p-3.5">
              <p className="text-xs text-(--text-secondary)">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={sectionCard}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <h3 className="font-semibold">การเติบโตของสมาชิก</h3>
          <div className="flex rounded-full border border-border bg-muted/25 p-1 text-xs">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRange(days as 7 | 30 | 90)}
                className={cn("rounded-full px-3 py-1.5 font-semibold", range === days ? "bg-accent-subtle text-[var(--brand-emphasis)]" : "text-(--text-secondary)")}
              >
                {days} วัน
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <TinyBars values={values} />
        </div>
      </section>

      <EarlyAccessCard value={earlyAccess} onEdit={() => setModalOpen(true)} />

      <section className={sectionCard + " p-4 sm:p-5"}>
        <h3 className="mb-3 font-semibold">Quick Actions</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <ButtonLink href="/studio/membership" variant="outline">ตั้งค่า Membership</ButtonLink>
          <Button variant="outline" onClick={() => setModalOpen(true)}>จัดการ Early Access</Button>
          <ButtonLink href="/studio/posts" variant="outline">สร้างโพสต์สำหรับสมาชิก</ButtonLink>
          <ButtonLink href="/studio/works/reborn-as-a-warlord/chapters/new" variant="outline">สร้างตอนพิเศษ</ButtonLink>
        </div>
      </section>

      <EarlyAccessSettingsModal
        open={modalOpen}
        value={earlyAccess}
        policy={policy}
        onClose={() => setModalOpen(false)}
        onSave={(input) => {
          setEarlyAccess(input.chapters);
          setPolicy(input.policy);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

export function ProfileCompletionCard({
  featuredSelected,
}: {
  featuredSelected: boolean;
}) {
  const progress = featuredSelected ? 100 : 80;
  return (
    <section className={sectionCard + " p-4"}>
      <p className="text-sm font-semibold">โปรไฟล์ของคุณพร้อม {progress}%</p>
      <ul className="mt-3 grid gap-1.5 text-sm text-(--text-secondary)">
        <li className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" /> รูปโปรไฟล์</li>
        <li className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" /> Bio</li>
        <li className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" /> แนวที่เขียน</li>
        <li className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" /> Username</li>
        <li className={cn("inline-flex items-center gap-1.5", !featuredSelected && "text-amber-500")}>
          {featuredSelected ? (
            <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <CircleAlert aria-hidden className="h-4 w-4 shrink-0" />
          )}
          ยังไม่ได้เลือกเรื่องแนะนำ
        </li>
      </ul>
      {!featuredSelected ? <Button className="mt-3" variant="outline">เลือกเรื่องแนะนำ</Button> : null}
    </section>
  );
}

export function FeaturedStorySelector({
  selectedSlug,
  onSelect,
}: {
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <section className={sectionCard + " p-4"}>
      <p className="font-semibold">เรื่องที่อยากแนะนำ</p>
      <div className="mt-3 grid gap-2">
        {stories.slice(0, 3).map((story) => (
          <button
            key={story.slug}
            type="button"
            onClick={() => onSelect(story.slug)}
            className={cn("rounded-lg border p-3 text-left", selectedSlug === story.slug ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card")}
          >
            <p className="font-semibold">{story.title}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-(--text-secondary)">
              {selectedSlug === story.slug ? (
                <CircleDot aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--brand-emphasis)]" />
              ) : (
                <Circle aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--text-tertiary)" />
              )}
              เลือกเป็นเรื่องแนะนำ
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

export function WriterProfilePreview({
  name,
  username,
  bio,
  tags,
  featuredStory,
}: {
  name: string;
  username: string;
  bio: string;
  tags: string[];
  featuredStory: string;
}) {
  return (
    <section className={sectionCard + " overflow-hidden"}>
      <div className="h-28 bg-[linear-gradient(120deg,#FF3B95_0%,#E830A5_52%,#8B2C91_100%)]/35" />
      <div className="px-5 pb-5">
        <span className="-mt-8 grid h-16 w-16 place-items-center rounded-full border border-border bg-card text-xl font-semibold">{writerProfile.avatar}</span>
        <p className="mt-3 text-xl font-semibold">{name}</p>
        <p className="text-sm text-(--text-secondary)">{username}</p>
        <p className="mt-2 text-sm text-(--text-secondary)">{tags.join(" • ")}</p>
        <p className="mt-2 text-xs leading-6 text-(--text-secondary)">{bio.split("\n").join(" ")}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="tabular-nums">{compact.format(writerProfile.followerCount)} ผู้ติดตาม</span>
          <span className="tabular-nums">{writerProfile.storyCount} เรื่อง</span>
          <span className="tabular-nums">{compact.format(writerProfile.readCount)} ยอดอ่าน</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button size="sm">
            <UserPlus aria-hidden className="h-4 w-4" />
            ติดตาม
          </Button>
          <Button size="sm" variant="outline">
            <Crown aria-hidden className="h-4 w-4" />
            เป็นสมาชิก
          </Button>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-sm font-semibold">เรื่องแนะนำ</p>
          <p className="mt-2 text-sm">{stories.find((story) => story.slug === featuredStory)?.title ?? stories[0].title}</p>
        </div>
      </div>
    </section>
  );
}

export function WriterProfileEditor() {
  const [name, setName] = useState(writerProfile.name);
  const [username, setUsername] = useState(writerProfile.username);
  const [bio, setBio] = useState(writerProfile.bio);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Dark Romance", "BL", "Omegaverse"]);
  const [featured, setFeatured] = useState(stories[0].slug);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= 5) return current;
      return [...current, tag];
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-4">
        <ProfileCompletionCard featuredSelected={Boolean(featured)} />
        <section className={sectionCard + " p-4 sm:p-5"}>
          <div className="flex flex-wrap gap-5">
            <div className="grid gap-2">
              <span className="grid h-16 w-16 place-items-center rounded-full border border-border bg-muted/35 text-lg font-semibold">{writerProfile.avatar}</span>
              <Button variant="outline" size="sm">เปลี่ยนรูป</Button>
            </div>
            <div className="grid min-w-[200px] flex-1 gap-2">
              <span className="grid h-20 place-items-center rounded-lg border border-dashed border-border bg-muted/35 text-xs text-(--text-tertiary)">COVER</span>
              <Button variant="outline" size="sm">เปลี่ยน Cover</Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Display Name">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Username">
              <Input value={username} onChange={(event) => setUsername(event.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-(--text-tertiary)">Preview URL: novelnow.com/{username}</p>

          <Field label="Bio">
            <Textarea value={bio} onChange={(event) => setBio(event.target.value)} className="min-h-28" />
          </Field>

          <div className="mt-4">
            <p className="text-sm font-semibold">คุณเขียนแนวไหนเป็นหลัก?</p>
            <p className="text-xs text-(--text-tertiary)">เลือกได้สูงสุด 5</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {writerGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleTag(genre)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    selectedTags.includes(genre)
                      ? "border-[var(--brand-emphasis)] bg-accent-subtle text-[var(--brand-emphasis)]"
                      : "border-border bg-card text-(--text-secondary)",
                  )}
                >
                  {genre}
                  {selectedTags.includes(genre) ? <Check aria-hidden className="ml-1 inline h-3.5 w-3.5" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <FeaturedStorySelector selectedSlug={featured} onSelect={setFeatured} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button>บันทึก</Button>
            <Button variant="outline" className="xl:hidden" onClick={() => setMobilePreviewOpen(true)}>
              ดูตัวอย่างโปรไฟล์
            </Button>
          </div>
        </section>
      </div>

      <div className="hidden xl:block">
        <WriterProfilePreview name={name} username={username} bio={bio} tags={selectedTags} featuredStory={featured} />
      </div>

      <Modal open={mobilePreviewOpen} onClose={() => setMobilePreviewOpen(false)} title="ตัวอย่างโปรไฟล์" size="lg">
        <WriterProfilePreview name={name} username={username} bio={bio} tags={selectedTags} featuredStory={featured} />
      </Modal>
    </div>
  );
}

function stateLabel(state: StoryState) {
  if (state === "writing") return "กำลังเขียน";
  if (state === "completed") return "จบแล้ว";
  if (state === "paused") return "พักการเผยแพร่";
  return "ฉบับร่าง";
}

const stateDotClass: Record<StoryState, string> = {
  writing: "bg-emerald-500",
  completed: "bg-[var(--brand-blue)]",
  draft: "bg-(--text-tertiary)",
  paused: "bg-amber-500",
};

export function StoryStatusBadge({ state }: { state: StoryState }) {
  return <StatusPill label={stateLabel(state)} dot={stateDotClass[state]} />;
}

export function StoryQuickActions({
  onComplete,
  onPause,
}: {
  onComplete: () => void;
  onPause: () => void;
}) {
  return (
    <div className="relative">
      <details>
        <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-lg text-(--text-secondary) hover:bg-muted [&::-webkit-details-marker]:hidden">
          <Ellipsis className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-border bg-card p-1.5 shadow-[var(--sh-2)]">
          {[
            "แก้ไขข้อมูลเรื่อง",
            "ดูหน้าเรื่อง",
            "แชร์เรื่อง",
            "จัดการราคา",
          ].map((item) => (
            <button key={item} type="button" className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted/60">
              {item}
            </button>
          ))}
          <button type="button" onClick={onComplete} className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted/60">
            ตั้งเป็นจบแล้ว
          </button>
          <button type="button" onClick={onPause} className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted/60">
            พักการเผยแพร่
          </button>
          <div className="my-1 h-px bg-border" />
          <button type="button" className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm text-destructive hover:bg-destructive/10">
            ลบเรื่อง
          </button>
        </div>
      </details>
    </div>
  );
}

export function MyStoryCard({
  story,
  onMarkComplete,
  onPause,
}: {
  story: (typeof stories)[number];
  onMarkComplete: () => void;
  onPause: () => void;
}) {
  return (
    <article className={sectionCard + " p-4 sm:p-5"}>
      <div className="flex items-start gap-4">
        <span aria-hidden className="grid h-24 w-16 shrink-0 place-items-center rounded-[8px] bg-muted/50 text-brand-primary">
          <BookMarked className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate font-semibold">{story.title}</h3>
            <StoryStatusBadge state={story.state} />
          </div>
          <p className="mt-1 text-xs text-(--text-tertiary)">{story.genre} · อัปเดตล่าสุด {story.updatedAt}</p>

          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-(--text-secondary)">
            <div className="inline-flex items-center gap-1.5">
              <FileText aria-hidden className="h-3.5 w-3.5 text-(--text-tertiary)" />
              <dt className="sr-only">จำนวนตอน</dt>
              <dd className="tabular-nums">{whole.format(story.chapters)} ตอน</dd>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Eye aria-hidden className="h-3.5 w-3.5 text-(--text-tertiary)" />
              <dt className="sr-only">ยอดอ่าน</dt>
              <dd className="tabular-nums">{compact.format(story.reads)}</dd>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Coins aria-hidden className="h-3.5 w-3.5 text-(--text-tertiary)" />
              <dt className="sr-only">รายได้เดือนนี้</dt>
              <dd className="tabular-nums">฿{money.format(story.monthlyRevenue)} เดือนนี้</dd>
            </div>
          </dl>

          {story.earlyAccessChapters > 0 ? (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full border border-[var(--brand-emphasis)]/35 px-2.5 py-1 text-xs font-medium text-[var(--brand-emphasis)]">
              <Sparkles aria-hidden className="h-3 w-3" />
              Early Access · สมาชิกอ่านก่อน {story.earlyAccessChapters} ตอน
            </p>
          ) : null}

          {story.draftTitle ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
              <PenLine aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-emphasis)]" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--brand-emphasis)]">มีฉบับร่างค้างอยู่</p>
                <p className="mt-0.5 truncate text-sm">{story.draftTitle}</p>
                <p className="text-xs text-(--text-tertiary) tabular-nums">{whole.format(story.draftWords)} คำ</p>
              </div>
            </div>
          ) : null}
        </div>

        <StoryQuickActions onComplete={onMarkComplete} onPause={onPause} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={`/studio/works/${story.slug}`} variant="outline" size="sm">จัดการเรื่อง</ButtonLink>
        {story.draftTitle ? (
          <ButtonLink href={`/studio/works/${story.slug}/chapters/2668/edit`} size="sm">
            เขียนต่อ
            <ArrowRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
        ) : (
          <ButtonLink href={`/studio/works/${story.slug}/chapters/new`} size="sm">
            <Plus aria-hidden className="h-4 w-4" />
            เขียนตอน
          </ButtonLink>
        )}
      </div>
    </article>
  );
}

export function MyStoriesGrid() {
  const [tab, setTab] = useState<"all" | "writing" | "completed" | "draft" | "paused">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof storySorts)[number]>("อัปเดตล่าสุด");
  const [items, setItems] = useState(stories);
  const [confirmComplete, setConfirmComplete] = useState<string | null>(null);
  const [confirmPause, setConfirmPause] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const byTab = items.filter((story) => (tab === "all" ? true : story.state === tab));
    const byQuery = byTab.filter((story) => (!term ? true : story.title.toLowerCase().includes(term)));
    if (sort === "ชื่อเรื่อง") return [...byQuery].sort((a, b) => a.title.localeCompare(b.title, "th"));
    if (sort === "ยอดอ่านสูงสุด") return [...byQuery].sort((a, b) => b.reads - a.reads);
    if (sort === "รายได้สูงสุด") return [...byQuery].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
    return byQuery;
  }, [items, query, sort, tab]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="flex gap-1.5 overflow-x-auto rounded-full border border-border bg-muted/25 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            ["all", "ทั้งหมด"],
            ["writing", "กำลังเขียน"],
            ["completed", "จบแล้ว"],
            ["draft", "ฉบับร่าง"],
            ["paused", "พักการเผยแพร่"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as "all" | "writing" | "completed" | "draft" | "paused")}
              className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", tab === id ? "bg-[var(--brand-primary)] text-white" : "text-(--text-secondary)")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อเรื่อง..."
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm placeholder:text-(--text-tertiary)"
            />
          </div>
          <Select value={sort} onChange={(event) => setSort(event.target.value as (typeof storySorts)[number])} className="sm:w-40">
            {storySorts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className={sectionCard}>
          <EmptyState
            icon={BookMarked}
            title="เรื่องแรกของคุณเริ่มได้จากตรงนี้"
            description="สร้างเรื่องใหม่ และเริ่มพาคนอ่านเข้าสู่โลกที่คุณกำลังเขียน"
            action={
              <ButtonLink href="/studio/works/new">
                <Plus aria-hidden className="h-4 w-4" />
                สร้างเรื่องแรก
              </ButtonLink>
            }
          />
        </section>
      ) : (
        <div className="grid gap-3">
          {filtered.map((story) => (
            <MyStoryCard
              key={story.slug}
              story={story}
              onMarkComplete={() => setConfirmComplete(story.slug)}
              onPause={() => setConfirmPause(story.slug)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmComplete)}
        onClose={() => setConfirmComplete(null)}
        onConfirm={() => {
          if (!confirmComplete) return;
          setItems((current) => current.map((item) => (item.slug === confirmComplete ? { ...item, state: "completed" as StoryState } : item)));
          setConfirmComplete(null);
        }}
        title="ตั้งเรื่องนี้เป็น “จบแล้ว”?"
        description="ผู้อ่านจะเห็นว่าเรื่องนี้จบสมบูรณ์แล้ว คุณยังสามารถแก้ไขตอนต่าง ๆ ได้ภายหลัง"
        confirmLabel="ตั้งเป็นจบแล้ว"
      />

      <ConfirmDialog
        open={Boolean(confirmPause)}
        onClose={() => setConfirmPause(null)}
        onConfirm={() => {
          if (!confirmPause) return;
          setItems((current) => current.map((item) => (item.slug === confirmPause ? { ...item, state: "paused" as StoryState } : item)));
          setConfirmPause(null);
        }}
        title="พักการเผยแพร่เรื่องนี้?"
        description="เรื่องยังคงอยู่ใน Library ของผู้อ่าน แต่จะไม่แสดงว่าเป็นเรื่องที่กำลังอัปเดต"
        confirmLabel="พักการเผยแพร่"
      />
    </div>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={sectionCard}>
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export function SettingsToggle({
  label,
  defaultChecked = false,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-3 py-3">
      <span className="text-sm">{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 accent-[var(--brand-primary)]" />
    </label>
  );
}

export function SettingsSelect({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm">{label}</label>
      <Select defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </Select>
    </div>
  );
}

export function WriterSettingsLayout() {
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className={sectionCard + " h-fit p-2"}>
        {[
          "บัญชีนักเขียน",
          "การแจ้งเตือน",
          "การเขียนและเผยแพร่",
          "ความเป็นส่วนตัว",
          "NovelNow Studio",
        ].map((item, index) => (
          <button
            key={item}
            type="button"
            className={cn(
              "flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm",
              index === 0 ? "bg-accent-subtle font-semibold text-[var(--brand-emphasis)]" : "text-(--text-secondary) hover:bg-muted/50",
            )}
          >
            {item}
            <ChevronRight className="h-4 w-4" />
          </button>
        ))}
      </nav>

      <div className="grid gap-4">
        <SettingsSection title="บัญชีนักเขียน">
          <div className="grid gap-2 text-sm">
            <p>ชื่อที่แสดง <span className="font-semibold">{writerProfile.name}</span></p>
            <p>Username <span className="font-semibold">{writerProfile.username}</span></p>
            <p>Email <span className="font-semibold">{writerProfile.emailMasked}</span></p>
          </div>
          <ButtonLink href="/studio/profile" variant="outline" className="w-fit">แก้ไขโปรไฟล์</ButtonLink>
        </SettingsSection>

        <SettingsSection title="การเขียนและเผยแพร่">
          <SettingsSelect label="ราคาตอนใหม่เริ่มต้น" options={["3 Coins", "5 Coins", "8 Coins"]} defaultValue="3 Coins" />
          <SettingsSelect label="จำนวนตอนฟรีเริ่มต้น" options={["3 ตอน", "5 ตอน", "7 ตอน"]} defaultValue="5 ตอน" />
          <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm">
            <p className="mb-2">ระดับความเข้มข้นของตอน</p>
            <p className="inline-flex items-center gap-1.5"><CircleDot aria-hidden className="h-4 w-4 text-[var(--brand-emphasis)]" /> ใช้ตามเรื่อง</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-(--text-secondary)"><Circle aria-hidden className="h-4 w-4" /> ถามทุกครั้ง</p>
          </div>
          <SettingsToggle label="เปิด Preview ก่อนเผยแพร่" defaultChecked />
        </SettingsSection>

        <SettingsSection title="การแจ้งเตือน">
          <p className="text-xs font-semibold text-(--text-tertiary)">ผลงาน</p>
          <SettingsToggle label="ตอนที่ตั้งเวลาเผยแพร่สำเร็จ" defaultChecked />
          <SettingsToggle label="ตอนใหม่เผยแพร่แล้ว" defaultChecked />
          <SettingsToggle label="มี Comment ใหม่" defaultChecked />
          <p className="mt-2 text-xs font-semibold text-(--text-tertiary)">แฟน</p>
          <SettingsToggle label="สรุปผู้ติดตามรายสัปดาห์" defaultChecked />
          <SettingsToggle label="สมาชิกใหม่" defaultChecked />
          <SettingsToggle label="Membership Update" defaultChecked />
          <p className="mt-2 text-xs font-semibold text-(--text-tertiary)">รายได้</p>
          <SettingsToggle label="สรุปรายได้รายสัปดาห์" defaultChecked />
          <SettingsToggle label="รายได้เพิ่มขึ้นผิดปกติ" defaultChecked />
        </SettingsSection>

        <SettingsSection title="ความเป็นส่วนตัว">
          <SettingsToggle label="แสดงจำนวนผู้ติดตามบนโปรไฟล์" defaultChecked />
          <SettingsToggle label="แสดงยอดอ่านรวมบนโปรไฟล์" defaultChecked />
          <SettingsToggle label="แสดงวันที่เข้าร่วม NovelNow" />
        </SettingsSection>

        <SettingsSection title="NovelNow Studio">
          <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm">
            <p className="mb-2">ธีม</p>
            <p className="inline-flex items-center gap-1.5"><CircleDot aria-hidden className="h-4 w-4 text-[var(--brand-emphasis)]" /> Dark</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-(--text-secondary)"><Circle aria-hidden className="h-4 w-4" /> System</p>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

export function StudioNotificationItem({ item }: { item: (typeof notificationItems)[number] }) {
  return (
    <article className="rounded-lg border border-border bg-card px-3 py-3">
      <p className="text-xs text-(--text-tertiary)">{item.category}</p>
      <p className="mt-1 text-sm font-semibold">{item.title}</p>
      <p className="text-xs text-(--text-secondary)">{item.detail}</p>
    </article>
  );
}

export function StudioNotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<"ทั้งหมด" | "ผลงาน" | "แฟน" | "รายได้" | "Membership">("ทั้งหมด");
  const rows = notificationItems.filter((item) => (filter === "ทั้งหมด" ? true : item.category === filter));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" aria-hidden={!open}>
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-(--bg-base) p-4 shadow-[var(--sh-3)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">การแจ้งเตือน</h3>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {["ทั้งหมด", "ผลงาน", "แฟน", "รายได้", "Membership"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item as "ทั้งหมด" | "ผลงาน" | "แฟน" | "รายได้" | "Membership")}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", filter === item ? "border-transparent bg-[var(--brand-primary)] text-white" : "border-border text-(--text-secondary)")}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-(--text-tertiary)">วันนี้</p>
        <div className="grid max-h-[calc(100vh-180px)] gap-2 overflow-y-auto pr-1">
          {rows.map((item) => (
            <StudioNotificationItem key={item.id} item={item} />
          ))}
        </div>
        <Button variant="ghost" className="mt-4 w-full">ดูทั้งหมด</Button>
      </aside>
    </div>
  );
}

export function StudioPageSkeleton() {
  return (
    <section className={sectionCard + " p-5"}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-8 w-72 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-11/12 rounded bg-muted" />
      </div>
    </section>
  );
}

export function StudioPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={sectionCard + " grid justify-items-center gap-3 px-6 py-12 text-center"}>
      <CircleAlert className="h-6 w-6 text-destructive" />
      <h3 className="font-semibold">โหลดข้อมูลไม่สำเร็จ</h3>
      <p className="text-sm text-(--text-secondary)">ลองอีกครั้งได้เลย ข้อมูลของคุณไม่ได้หายไป</p>
      <Button variant="outline" onClick={onRetry}>ลองใหม่</Button>
    </section>
  );
}

export function StudioPageStateBar({
  state,
  onStateChange,
}: {
  state: "normal" | "loading" | "error" | "empty" | "no-data";
  onStateChange: (state: "normal" | "loading" | "error" | "empty" | "no-data") => void;
}) {
  const labels: Array<["normal" | "loading" | "error" | "empty" | "no-data", string]> = [
    ["normal", "Normal"],
    ["loading", "Loading"],
    ["error", "Error"],
    ["empty", "Empty"],
    ["no-data", "No Data"],
  ];
  return (
    <details className="mb-4 rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-2 text-xs text-(--text-tertiary)">
      <summary className="cursor-pointer select-none font-semibold">ตัวอย่างสถานะสำหรับการทดสอบ</summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {labels.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onStateChange(key)}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold", state === key ? "border-transparent bg-accent-subtle text-[var(--brand-emphasis)]" : "border-border text-(--text-secondary)")}
          >
            {label}
          </button>
        ))}
      </div>
    </details>
  );
}

export function StudioHomeModules() {
  const activeStories = stories.filter((story) => story.state === "writing").slice(0, 3);
  const draftStories = stories.filter((story) => story.draftTitle);
  const heroDraft = draftStories[0];
  const heroLatest = activeStories[0];
  const topPreference = fanPreferences[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid content-start gap-4">
        <section className={cn(sectionCard, "overflow-hidden")}>
          <div className="bg-[linear-gradient(135deg,rgba(255,59,149,0.16),rgba(232,48,165,0.05),rgba(139,44,145,0.09))] p-5 sm:p-6">
            <p className="text-sm text-(--text-secondary)">สวัสดี {writerProfile.name} ✦</p>
            {heroDraft ? (
              <>
                <h2 className="mt-1 text-xl font-semibold sm:text-2xl">ทำต่อจากที่ค้างไว้</h2>
                <p className="mt-3 text-lg font-semibold">{heroDraft.draftTitle}</p>
                <p className="mt-1 text-xs tabular-nums text-(--text-tertiary)">
                  {whole.format(heroDraft.draftWords)} คำ · บันทึกล่าสุด {heroDraft.updatedAt}
                </p>
                <ButtonLink href={`/studio/works/${heroDraft.slug}/chapters/2668/edit`} className="mt-4">
                  เขียนต่อ
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </ButtonLink>
              </>
            ) : (
              <>
                <h2 className="mt-1 text-xl font-semibold sm:text-2xl">พร้อมสำหรับตอนต่อไปแล้ว</h2>
                {heroLatest ? <p className="mt-2 text-sm text-(--text-secondary)">ตอนล่าสุด {heroLatest.latestEp}</p> : null}
                <ButtonLink href={heroLatest ? `/studio/works/${heroLatest.slug}/chapters/new` : "/studio/works/new"} className="mt-4">
                  <Plus aria-hidden className="h-4 w-4" />
                  เขียนตอนใหม่
                </ButtonLink>
              </>
            )}
          </div>
        </section>

        <section aria-label="สรุปวันนี้" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile icon={Eye} label="ยอดอ่านวันนี้" value="12.4K" />
          <StatTile icon={UserPlus} label="ผู้ติดตามใหม่" value="142" />
          <StatTile icon={Crown} label="สมาชิกใหม่" value="18" />
          <StatTile icon={Coins} label="รายได้วันนี้" value="840" unit="บาท" tone="money" />
        </section>

        <StudioPanel
          title="ผลงานของคุณ"
          description="เรื่องที่กำลังเขียนอยู่ตอนนี้"
          action={
            <Link
              href="/studio/stories"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
            >
              ดูทั้งหมด
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {activeStories.map((story) => (
              <li key={story.slug}>
                <StudioRowLink href={`/studio/works/${story.slug}`}>
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="grid h-12 w-9 shrink-0 place-items-center rounded-[6px] bg-accent-subtle text-brand-primary">
                      <BookMarked className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{story.title}</p>
                      <p className="mt-0.5 truncate text-xs text-(--text-tertiary)">ล่าสุด {story.latestEp} · แก้ไข{story.updatedAt}</p>
                    </div>
                    <span className="hidden shrink-0 text-xs font-semibold text-[var(--brand-emphasis)] sm:inline">เขียนต่อ</span>
                  </div>
                </StudioRowLink>
              </li>
            ))}
          </ul>
        </StudioPanel>
      </div>

      <div className="grid content-start gap-4">
        <section className={cn(sectionCard, "p-4")}>
          <p className="text-xs font-semibold text-(--text-tertiary)">แนวที่กำลังมาแรงกับแฟนของคุณ</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-lg font-semibold">
            <Flame aria-hidden className="h-4 w-4 text-brand-primary" />
            {topPreference.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-(--text-secondary)">แฟน {topPreference.value}% ชอบแนวนี้ ลองวางฉากพีคใน 2 ตอนถัดไป</p>
          <ButtonLink href="/studio/fans" variant="outline" className="mt-3 w-full">ดูแฟนของฉัน</ButtonLink>
        </section>

        {draftStories.length > 0 ? (
          <section className={cn(sectionCard, "p-4")}>
            <p className="text-xs font-semibold text-(--text-tertiary)">ฉบับร่างที่ค้างอยู่</p>
            <ul className="mt-2 grid gap-2">
              {draftStories.map((story) => (
                <li key={story.slug} className="rounded-lg border border-border bg-card p-3">
                  <p className="truncate text-sm font-semibold">{story.draftTitle}</p>
                  <p className="mt-0.5 truncate text-xs text-(--text-tertiary)">{story.title} · {whole.format(story.draftWords)} คำ</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function PageTopActions({
  writingCta,
  showBell,
  onOpenBell,
}: {
  writingCta?: ReactNode;
  showBell?: boolean;
  onOpenBell?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
      {showBell ? (
        <button
          type="button"
          onClick={onOpenBell}
          className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-card text-(--text-secondary) hover:bg-muted"
          aria-label="การแจ้งเตือน"
        >
          <Bell className="h-4 w-4" />
        </button>
      ) : null}
      {writingCta}
    </div>
  );
}
