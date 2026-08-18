"use client";

import { Bell, Bookmark, BookOpen, Check, Heart, LoaderCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn, formatNumber } from "@/lib/utils";

type ActionKind = "follow" | "library";
export type NovelLibraryStatus = "READING" | "PLAN_TO_READ" | "COMPLETED" | "DROPPED";

type PendingNovelIntent = {
  slug: string;
  kind: ActionKind;
  status?: NovelLibraryStatus;
  createdAt: number;
};

const PENDING_NOVEL_INTENT_KEY = "niyainow-pending-novel-action-v1";
const PENDING_NOVEL_INTENT_TTL = 20 * 60 * 1_000;

function rememberPendingIntent(intent: PendingNovelIntent) {
  try {
    sessionStorage.setItem(PENDING_NOVEL_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // Authentication still works when storage is unavailable; only auto-complete is skipped.
  }
}

function takePendingIntent(slug: string, kind: ActionKind, status?: NovelLibraryStatus) {
  try {
    const raw = sessionStorage.getItem(PENDING_NOVEL_INTENT_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as PendingNovelIntent;
    if (!intent.createdAt || Date.now() - intent.createdAt > PENDING_NOVEL_INTENT_TTL) {
      sessionStorage.removeItem(PENDING_NOVEL_INTENT_KEY);
      return null;
    }
    if (intent.slug !== slug || intent.kind !== kind || intent.status !== status) return null;
    sessionStorage.removeItem(PENDING_NOVEL_INTENT_KEY);
    return intent;
  } catch {
    return null;
  }
}

function currentCallbackPath(fallback: string) {
  try {
    const path = `${window.location.pathname}${window.location.search}`;
    return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
  } catch {
    return fallback;
  }
}

function useNovelAction({
  slug,
  kind,
  initialActive,
  status = "PLAN_TO_READ",
  initialStatus,
  initialHasProgress,
}: {
  slug: string;
  kind: ActionKind;
  initialActive?: boolean;
  status?: NovelLibraryStatus;
  initialStatus?: NovelLibraryStatus | null;
  initialHasProgress?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const inferredInitialStatus = initialStatus !== undefined
    ? initialStatus
    : initialActive === true && kind === "library"
      ? status
      : initialActive === false && kind === "library"
        ? null
        : undefined;
  const [followOverride, setFollowOverride] = useState<boolean | undefined>(undefined);
  const [statusOverride, setStatusOverride] = useState<NovelLibraryStatus | null | undefined>(undefined);
  const [hasProgressOverride, setHasProgressOverride] = useState<boolean | undefined>(undefined);
  const followed = followOverride ?? Boolean(initialActive);
  const libraryStatus = statusOverride !== undefined ? statusOverride : inferredInitialStatus;
  const active = kind === "follow" ? followed : libraryStatus === status;
  const inLibrary = kind === "library" && libraryStatus !== undefined ? libraryStatus !== null : Boolean(initialActive);
  const stateKnown = kind === "follow"
    ? initialActive !== undefined || followOverride !== undefined
    : libraryStatus !== undefined;
  const hasProgress = hasProgressOverride ?? initialHasProgress;
  const [pending, startTransition] = useTransition();

  const loginPath = pathname || `/novel/${slug}`;
  const redirectToLogin = (intent: PendingNovelIntent) => {
    rememberPendingIntent(intent);
    router.push(`/login?callbackUrl=${encodeURIComponent(currentCallbackPath(loginPath))}`);
  };

  useEffect(() => {
    const intent = takePendingIntent(slug, kind, kind === "library" ? status : undefined);
    if (!intent) return;

    startTransition(async () => {
      const endpoint = kind === "follow" ? "/api/me/follows" : "/api/me/library";
      try {
        if (kind === "library" && status === "PLAN_TO_READ") {
          const stateResponse = await fetch(`/api/me/state?slug=${encodeURIComponent(slug)}`, {
            headers: { Accept: "application/json" },
          });
          if (stateResponse.status === 401) {
            rememberPendingIntent(intent);
            return;
          }
          if (!stateResponse.ok) throw new Error("pending_state_lookup_failed");
          const payload = (await stateResponse.json()) as { data?: { libraryStatus?: NovelLibraryStatus | null } };
          const currentStatus = payload.data?.libraryStatus ?? null;
          setStatusOverride(currentStatus);
          if (currentStatus === "READING" || currentStatus === "COMPLETED" || currentStatus === "PLAN_TO_READ") {
            router.refresh();
            return;
          }
        }
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ...(kind === "library" ? { status } : {}) }),
        });
        if (response.status === 401) {
          rememberPendingIntent(intent);
          return;
        }
        if (!response.ok) throw new Error("pending_mutation_failed");
        if (kind === "follow") setFollowOverride(true);
        else setStatusOverride(status);
        if (kind !== "follow") router.refresh();
        toast({ tone: "success", message: kind === "follow" ? "ติดตามเรื่องนี้แล้ว" : "เพิ่มนิยายเข้าคลังแล้ว" });
      } catch {
        rememberPendingIntent(intent);
        toast({ tone: "error", message: "ดำเนินการที่ค้างไว้ไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  }, [kind, router, slug, status, toast]);

  const toggle = () => {
    if (pending) return;

    startTransition(async () => {
      const endpoint = kind === "follow" ? "/api/me/follows" : "/api/me/library";
      let previousFollow = followed;
      let previousStatus = libraryStatus;
      let progressKnown = hasProgress;
      try {
        if (!stateKnown || (kind === "library" && status === "COMPLETED" && libraryStatus === "COMPLETED" && progressKnown === undefined)) {
          const stateResponse = await fetch(`/api/me/state?slug=${encodeURIComponent(slug)}`, {
            headers: { Accept: "application/json" },
          });
          if (stateResponse.status === 401) {
            redirectToLogin({ slug, kind, status: kind === "library" ? status : undefined, createdAt: Date.now() });
            return;
          }
          if (!stateResponse.ok) throw new Error("state_lookup_failed");

          const payload = (await stateResponse.json()) as {
            data?: { followed?: boolean; libraryStatus?: NovelLibraryStatus | null; progress?: unknown | null };
          };
          previousFollow = Boolean(payload.data?.followed);
          previousStatus = payload.data?.libraryStatus ?? null;
          progressKnown = Boolean(payload.data?.progress);
          setFollowOverride(previousFollow);
          setStatusOverride(previousStatus);
          setHasProgressOverride(progressKnown);
        }

        if (kind === "library" && status === "PLAN_TO_READ" && (previousStatus === "READING" || previousStatus === "COMPLETED")) {
          toast({
            tone: "info",
            message: previousStatus === "COMPLETED"
              ? "เรื่องนี้อยู่ในสถานะอ่านจบแล้ว จัดการสถานะได้จากคลังของฉัน"
              : "เรื่องนี้อยู่ในสถานะกำลังอ่าน จึงไม่ลบออกจากคลังโดยไม่ตั้งใจ",
          });
          return;
        }

        const nextFollow = !previousFollow;
        const nextStatus: NovelLibraryStatus | null = status === "COMPLETED"
          ? previousStatus === "COMPLETED"
            ? progressKnown ? "READING" : "PLAN_TO_READ"
            : "COMPLETED"
          : previousStatus === "PLAN_TO_READ"
            ? null
            : "PLAN_TO_READ";
        const method = kind === "follow"
          ? nextFollow ? "PUT" : "DELETE"
          : nextStatus === null ? "DELETE" : "PUT";
        if (kind === "follow") setFollowOverride(nextFollow);
        else setStatusOverride(nextStatus);
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ...(kind === "library" && nextStatus ? { status: nextStatus } : {}) }),
        });

        if (response.status === 401) {
          setFollowOverride(previousFollow);
          setStatusOverride(previousStatus);
          const activating = kind === "follow" ? nextFollow : nextStatus !== null;
          if (activating) redirectToLogin({ slug, kind, status: kind === "library" ? status : undefined, createdAt: Date.now() });
          else router.push(`/login?callbackUrl=${encodeURIComponent(currentCallbackPath(loginPath))}`);
          return;
        }
        if (!response.ok) throw new Error("mutation_failed");

        if (kind !== "follow") router.refresh();
        toast({
          tone: "success",
          message: kind === "follow"
            ? nextFollow ? "ติดตามเรื่องนี้แล้ว" : "เลิกติดตามแล้ว"
            : status === "COMPLETED"
              ? nextStatus === "COMPLETED" ? "ทำเครื่องหมายว่าอ่านจบแล้ว" : "เปลี่ยนกลับเป็นกำลังอ่านแล้ว"
              : nextStatus ? "เพิ่มนิยายเข้าคลังแล้ว" : "นำออกจากคลังแล้ว",
        });
      } catch {
        setFollowOverride(previousFollow);
        setStatusOverride(previousStatus);
        toast({ tone: "error", message: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  return { active, inLibrary, libraryStatus, pending, toggle };
}

export function FollowButton({
  slug,
  initialActive,
  quiet = false,
}: {
  slug: string;
  initialActive?: boolean;
  quiet?: boolean;
}) {
  const action = useNovelAction({ slug, kind: "follow", initialActive });
  return (
    <Button
      variant={action.active ? "secondary" : quiet ? "ghost" : "outline"}
      onClick={action.toggle}
      disabled={action.pending}
      aria-busy={action.pending}
      aria-pressed={action.active}
      className="disabled:cursor-wait disabled:opacity-100"
    >
      {action.active ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {action.active ? "ติดตามแล้ว" : "ติดตามเรื่อง"}
    </Button>
  );
}

export function BookmarkButton({
  slug,
  initialActive,
  initialStatus,
}: {
  slug: string;
  initialActive?: boolean;
  initialStatus?: NovelLibraryStatus | null;
}) {
  const action = useNovelAction({ slug, kind: "library", initialActive, initialStatus });
  const managed = action.libraryStatus === "READING" || action.libraryStatus === "COMPLETED";
  const label = managed
    ? action.libraryStatus === "COMPLETED" ? "อยู่ในคลัง: อ่านจบแล้ว" : "อยู่ในคลัง: กำลังอ่าน"
    : action.active ? "นำออกจากคลัง" : "เพิ่มเข้าคลัง";
  return (
    <Button
      variant={action.inLibrary ? "secondary" : "ghost"}
      size="icon"
      onClick={action.toggle}
      disabled={action.pending}
      aria-label={label}
      aria-pressed={action.inLibrary}
      title={label}
    >
      {action.pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bookmark className={action.inLibrary ? "h-4 w-4 fill-current text-[var(--brand-accent)]" : "h-4 w-4"} />}
    </Button>
  );
}

export function BookmarkToggle({
  slug,
  compact = false,
  initialActive,
  initialStatus,
}: {
  slug: string;
  compact?: boolean;
  initialActive?: boolean;
  initialStatus?: NovelLibraryStatus | null;
}) {
  const action = useNovelAction({ slug, kind: "library", initialActive, initialStatus });
  const managed = action.libraryStatus === "READING" || action.libraryStatus === "COMPLETED";
  const label = managed ? "เรื่องนี้อยู่ในคลังและมีสถานะการอ่าน" : action.active ? "นำออกจากคลัง" : "เพิ่มเข้าคลัง";

  return (
    <button
      type="button"
      onClick={action.toggle}
      disabled={action.pending}
      aria-pressed={action.inLibrary}
      aria-label={label}
      title={label}
      className={cn(
        "grid place-items-center rounded-[6px] bg-black/72 text-white transition-colors hover:bg-black/85 disabled:cursor-wait disabled:opacity-70",
        compact ? "h-11 w-11" : "h-12 w-12",
      )}
    >
      {action.pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className={cn("h-4 w-4", action.inLibrary && "fill-[var(--brand-emphasis)] text-[var(--brand-emphasis)]")} />
      )}
    </button>
  );
}

/** ปุ่มคลังแบบมีป้ายกำกับ + จำนวนคนที่บันทึกไว้ ใช้ในหัวหน้ารายละเอียดนิยาย */
export function LibraryButton({
  slug,
  initialActive,
  initialStatus,
  count,
}: {
  slug: string;
  initialActive?: boolean;
  initialStatus?: NovelLibraryStatus | null;
  count?: number;
}) {
  const action = useNovelAction({ slug, kind: "library", initialActive, initialStatus });
  const initialMembership = initialStatus !== undefined ? Boolean(initialStatus) : Boolean(initialActive);
  // นับแบบมองเห็นทันทีหลังกด ก่อน router.refresh() จะพาค่าจริงมา
  const displayCount = typeof count === "number"
    ? Math.max(0, count + (action.inLibrary === initialMembership ? 0 : action.inLibrary ? 1 : -1))
    : undefined;
  const statusLabel = action.libraryStatus === "READING"
    ? "กำลังอ่าน"
    : action.libraryStatus === "COMPLETED"
      ? "อ่านจบแล้ว"
      : action.inLibrary ? "อยู่ในคลัง" : "เพิ่มในคลัง";

  return (
    <Button variant={action.inLibrary ? "secondary" : "outline"} onClick={action.toggle} disabled={action.pending} aria-pressed={action.inLibrary}>
      {action.pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Heart className={cn("h-4 w-4", action.inLibrary && "fill-current")} />}
      {statusLabel}
      {typeof displayCount === "number" ? (
        <span className="tabular text-xs font-medium opacity-70">{formatNumber(displayCount)}</span>
      ) : null}
    </Button>
  );
}

/**
 * แถบคำสั่งลอยล่างจอสำหรับมือถือ (ส่วนที่ 6.2)
 * ปุ่มหลัก "เริ่มอ่าน" กินพื้นที่ส่วนใหญ่ ที่เหลือเป็นไอคอนขนาดแตะได้ 44px
 * วางเหนือ bottom nav เดิม 56px + safe-area จึงไม่ทับกัน
 */
export function NovelActionBar({
  slug,
  startHref,
  startLabel,
  followed,
  inLibrary,
  libraryStatus,
}: {
  slug: string;
  startHref: string;
  startLabel: string;
  followed?: boolean;
  inLibrary?: boolean;
  libraryStatus?: NovelLibraryStatus | null;
}) {
  const follow = useNovelAction({ slug, kind: "follow", initialActive: followed });
  const library = useNovelAction({ slug, kind: "library", initialActive: inLibrary, initialStatus: libraryStatus });
  const managedLibrary = library.libraryStatus === "READING" || library.libraryStatus === "COMPLETED";

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background px-4 py-2.5 lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <Link
          href={startHref}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[var(--brand-primary)] text-base font-semibold text-white shadow-[var(--sh-brand)] active:translate-y-px"
        >
          <BookOpen className="h-5 w-5" />
          {startLabel}
        </Link>

        <button
          type="button"
          onClick={follow.toggle}
          disabled={follow.pending}
          aria-busy={follow.pending}
          aria-pressed={follow.active}
          aria-label={follow.active ? "เลิกติดตามเรื่องนี้" : "ติดตามเรื่องนี้"}
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border border-border transition-colors disabled:cursor-wait disabled:opacity-100",
            follow.active ? "bg-[var(--brand-primary)] text-white" : "bg-card text-muted-foreground",
          )}
        >
          {follow.active ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={library.toggle}
          disabled={library.pending}
          aria-pressed={library.inLibrary}
          aria-label={managedLibrary ? "เรื่องนี้อยู่ในคลังและมีสถานะการอ่าน" : library.active ? "นำออกจากคลัง" : "เพิ่มในคลัง"}
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border border-border transition-colors disabled:opacity-60",
            library.inLibrary ? "bg-[var(--brand-primary)] text-white" : "bg-card text-muted-foreground",
          )}
        >
          {library.pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Bookmark className={cn("h-5 w-5", library.inLibrary && "fill-current")} />}
        </button>
      </div>
    </div>
  );
}

/** แชร์ผ่านเมนูของระบบถ้ามี ไม่มีก็คัดลอกลิงก์ให้แทน */
export function ShareButton({ title, compact = false }: { title: string; compact?: boolean }) {
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
    <Button
      variant="outline"
      size={compact ? "icon" : "md"}
      onClick={() => void share()}
      disabled={busy}
      aria-label={compact ? "แชร์" : undefined}
      title={compact ? "แชร์" : undefined}
    >
      <Share2 className="h-4 w-4" />
      {compact ? <span className="sr-only">แชร์</span> : "แชร์"}
    </Button>
  );
}

export function CompleteButton({
  slug,
  initialActive,
  initialStatus,
  initialHasProgress,
}: {
  slug: string;
  initialActive?: boolean;
  initialStatus?: NovelLibraryStatus | null;
  initialHasProgress?: boolean;
}) {
  const action = useNovelAction({ slug, kind: "library", status: "COMPLETED", initialActive, initialStatus, initialHasProgress });
  return (
    <Button variant={action.active ? "secondary" : "outline"} onClick={action.toggle} disabled={action.pending}>
      {action.pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Heart className={action.active ? "h-4 w-4 fill-current" : "h-4 w-4"} />}
      {action.active ? "อ่านจบแล้ว" : "ทำเครื่องหมายว่าอ่านจบ"}
    </Button>
  );
}
