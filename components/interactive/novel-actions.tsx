"use client";

import { Bell, Bookmark, Check, Heart, LoaderCircle, Share2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn, formatNumber } from "@/lib/utils";

type ActionKind = "follow" | "library";

function useNovelAction({
  slug,
  kind,
  initialActive,
  status = "PLAN_TO_READ",
}: {
  slug: string;
  kind: ActionKind;
  initialActive?: boolean;
  status?: "READING" | "PLAN_TO_READ" | "COMPLETED" | "DROPPED";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [activeOverride, setActive] = useState<boolean | undefined>(undefined);
  const active = activeOverride ?? Boolean(initialActive);
  const stateKnown = initialActive !== undefined || activeOverride !== undefined;
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (pending) return;

    startTransition(async () => {
      const endpoint = kind === "follow" ? "/api/me/follows" : "/api/me/library";
      let previous = active;
      try {
        if (!stateKnown) {
          const stateResponse = await fetch(`/api/me/state?slug=${encodeURIComponent(slug)}`, {
            headers: { Accept: "application/json" },
          });
          if (stateResponse.status === 401) {
            router.push(`/login?callbackUrl=${encodeURIComponent(pathname || `/novel/${slug}`)}`);
            return;
          }
          if (!stateResponse.ok) throw new Error("state_lookup_failed");

          const payload = (await stateResponse.json()) as {
            data?: { followed?: boolean; libraryStatus?: string | null };
          };
          previous = kind === "follow"
            ? Boolean(payload.data?.followed)
            : status === "COMPLETED"
              ? payload.data?.libraryStatus === "COMPLETED"
              : Boolean(payload.data?.libraryStatus);
          setActive(previous);
        }

        const next = !previous;
        setActive(next);
        const response = await fetch(endpoint, {
          method: next ? "PUT" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ...(kind === "library" && next ? { status } : {}) }),
        });

        if (response.status === 401) {
          setActive(previous);
          router.push(`/login?callbackUrl=${encodeURIComponent(pathname || `/novel/${slug}`)}`);
          return;
        }
        if (!response.ok) throw new Error("mutation_failed");

        router.refresh();
        toast({
          tone: "success",
          message: next
            ? kind === "follow" ? "ติดตามเรื่องนี้แล้ว" : "เพิ่มนิยายเข้าคลังแล้ว"
            : kind === "follow" ? "เลิกติดตามแล้ว" : "นำออกจากคลังแล้ว",
        });
      } catch {
        setActive(previous);
        toast({ tone: "error", message: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  return { active, pending, toggle };
}

export function FollowButton({ slug, initialActive }: { slug: string; initialActive?: boolean }) {
  const action = useNovelAction({ slug, kind: "follow", initialActive });
  return (
    <Button variant={action.active ? "secondary" : "outline"} onClick={action.toggle} disabled={action.pending}>
      {action.pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : action.active ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {action.active ? "ติดตามแล้ว" : "ติดตามเรื่อง"}
    </Button>
  );
}

export function BookmarkButton({ slug, initialActive }: { slug: string; initialActive?: boolean }) {
  const action = useNovelAction({ slug, kind: "library", initialActive });
  return (
    <Button
      variant={action.active ? "secondary" : "ghost"}
      size="icon"
      onClick={action.toggle}
      disabled={action.pending}
      aria-label={action.active ? "นำออกจากคลัง" : "เพิ่มเข้าคลัง"}
      aria-pressed={action.active}
      title={action.active ? "นำออกจากคลัง" : "เพิ่มเข้าคลัง"}
    >
      {action.pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bookmark className={action.active ? "h-4 w-4 fill-current text-[var(--brand-accent)]" : "h-4 w-4"} />}
    </Button>
  );
}

export function BookmarkToggle({
  slug,
  compact = false,
  initialActive,
}: {
  slug: string;
  compact?: boolean;
  initialActive?: boolean;
}) {
  const action = useNovelAction({ slug, kind: "library", initialActive });

  return (
    <button
      type="button"
      onClick={action.toggle}
      disabled={action.pending}
      aria-pressed={action.active}
      aria-label={action.active ? "นำออกจากคลัง" : "เพิ่มเข้าคลัง"}
      title={action.active ? "นำออกจากคลัง" : "เพิ่มเข้าคลัง"}
      className={cn(
        "grid place-items-center rounded-[8px] bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 disabled:cursor-wait disabled:opacity-70",
        compact ? "h-8 w-8" : "h-11 w-11",
      )}
    >
      {action.pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className={cn("h-4 w-4", action.active && "fill-[var(--brand-pink)] text-[var(--brand-pink)]")} />
      )}
    </button>
  );
}

/** ปุ่มคลังแบบมีป้ายกำกับ + จำนวนคนที่บันทึกไว้ ใช้ในหัวหน้ารายละเอียดนิยาย */
export function LibraryButton({
  slug,
  initialActive,
  count,
}: {
  slug: string;
  initialActive?: boolean;
  count?: number;
}) {
  const action = useNovelAction({ slug, kind: "library", initialActive });
  // นับแบบมองเห็นทันทีหลังกด ก่อน router.refresh() จะพาค่าจริงมา
  const displayCount = typeof count === "number"
    ? Math.max(0, count + (action.active === Boolean(initialActive) ? 0 : action.active ? 1 : -1))
    : undefined;

  return (
    <Button variant={action.active ? "secondary" : "outline"} onClick={action.toggle} disabled={action.pending} aria-pressed={action.active}>
      {action.pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Heart className={cn("h-4 w-4", action.active && "fill-current")} />}
      {action.active ? "อยู่ในคลัง" : "เพิ่มในคลัง"}
      {typeof displayCount === "number" ? (
        <span className="tabular text-xs font-medium opacity-70">{formatNumber(displayCount)}</span>
      ) : null}
    </Button>
  );
}

/** แชร์ผ่านเมนูของระบบถ้ามี ไม่มีก็คัดลอกลิงก์ให้แทน */
export function ShareButton({ title }: { title: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ tone: "success", message: "คัดลอกลิงก์แล้ว" });
      }
    } catch (error) {
      // ผู้ใช้กดยกเลิกแผงแชร์ไม่ใช่ความผิดพลาด จึงไม่ต้องเตือน
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast({ tone: "error", message: "แชร์ไม่สำเร็จ กรุณาคัดลอกลิงก์จากแถบที่อยู่" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={() => void share()} disabled={busy}>
      <Share2 className="h-4 w-4" />
      แชร์
    </Button>
  );
}

export function CompleteButton({ slug, initialActive }: { slug: string; initialActive?: boolean }) {
  const action = useNovelAction({ slug, kind: "library", status: "COMPLETED", initialActive });
  return (
    <Button variant={action.active ? "secondary" : "outline"} onClick={action.toggle} disabled={action.pending}>
      {action.pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Heart className={action.active ? "h-4 w-4 fill-current" : "h-4 w-4"} />}
      {action.active ? "อ่านจบแล้ว" : "ทำเครื่องหมายว่าอ่านจบ"}
    </Button>
  );
}
