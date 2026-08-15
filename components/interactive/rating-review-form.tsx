"use client";

import { LoaderCircle, Star, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import {
  createPendingRatingReviewIntent,
  PENDING_RATING_REVIEW_INTENT_KEY,
  readPendingRatingReviewIntent,
  storePendingRatingReviewIntent,
  type PendingRatingReviewAction,
  type PendingRatingReviewIntent,
} from "@/lib/auth/pending-rating-review-intent";
import { cn } from "@/lib/utils";

type InitialReview = {
  title: string | null;
  body: string;
  isSpoiler: boolean;
  status: "PENDING" | "PUBLISHED" | "HIDDEN" | "REJECTED";
} | null;

type ReviewStatus = NonNullable<InitialReview>["status"];
type ReviewDraft = PendingRatingReviewIntent["draft"];

class AuthenticationExpiredError extends Error {
  constructor() {
    super("authentication_expired");
    this.name = "AuthenticationExpiredError";
  }
}

function storePendingIntent(intent: PendingRatingReviewIntent) {
  try {
    return storePendingRatingReviewIntent(window.sessionStorage, intent);
  } catch {
    return false;
  }
}

function readPendingIntent(slug: string, consume: boolean) {
  try {
    return readPendingRatingReviewIntent(window.sessionStorage, slug, consume);
  } catch {
    return null;
  }
}

function clearStoredReviewDraft(slug: string) {
  const intent = readPendingIntent(slug, false);
  if (!intent || intent.action === "rating") return;
  try {
    window.sessionStorage.removeItem(PENDING_RATING_REVIEW_INTENT_KEY);
  } catch {
    // The next successful write replaces the old draft; otherwise it expires.
  }
}

function currentCallbackPath(fallback: string) {
  try {
    const callbackPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return callbackPath.startsWith("/") && !callbackPath.startsWith("//") ? callbackPath : fallback;
  } catch {
    return fallback;
  }
}

async function persistRating(slug: string, score: number) {
  const response = await fetch("/api/me/rating", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, score }),
  });
  if (response.status === 401) throw new AuthenticationExpiredError();
  if (!response.ok) throw new Error("rating_failed");
}

async function persistReview(slug: string, draft: ReviewDraft) {
  const response = await fetch("/api/me/reviews", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      title: draft.title.trim() || null,
      body: draft.body.trim(),
      isSpoiler: draft.isSpoiler,
    }),
  });
  if (response.status === 401) throw new AuthenticationExpiredError();
  if (!response.ok) throw new Error("review_failed");
}

async function persistReviewRemoval(slug: string) {
  const response = await fetch("/api/me/reviews", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  if (response.status === 401) throw new AuthenticationExpiredError();
  if (!response.ok) throw new Error("review_delete_failed");
}

function statusLabel(status: ReviewStatus) {
  if (status === "PUBLISHED") return "เผยแพร่แล้ว";
  if (status === "REJECTED") return "ไม่ผ่านการตรวจสอบ";
  if (status === "HIDDEN") return "ซ่อนอยู่";
  return "รอตรวจสอบ";
}

export function RatingReviewForm({
  slug,
  isAuthenticated,
  initialRating = null,
  initialReview = null,
}: {
  slug: string;
  isAuthenticated: boolean;
  initialRating?: number | null;
  initialReview?: InitialReview;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState(initialReview);
  const [title, setTitle] = useState(initialReview?.title ?? "");
  const [body, setBody] = useState(initialReview?.body ?? "");
  const [isSpoiler, setIsSpoiler] = useState(initialReview?.isSpoiler ?? false);
  const [ratingPending, startRatingTransition] = useTransition();
  const [reviewPending, startReviewTransition] = useTransition();
  const guestDraftRestoredFor = useRef<string | null>(null);
  const replayStartedFor = useRef<string | null>(null);

  const rememberLoginAction = (action: PendingRatingReviewAction, score?: number) => {
    const intent = createPendingRatingReviewIntent({ slug, action, title, body, isSpoiler, score });
    if (!intent || !storePendingIntent(intent)) {
      toast({
        tone: "error",
        message: "เบราว์เซอร์ไม่อนุญาตให้เก็บรายการนี้ชั่วคราว จึงยังไม่พาไปเข้าสู่ระบบเพื่อป้องกันข้อมูลหาย",
      });
      return false;
    }

    const fallback = pathname || `/novel/${slug}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(currentCallbackPath(fallback))}`);
    return true;
  };

  const rememberDraftChange = (draft: ReviewDraft) => {
    if (isAuthenticated) return;
    const pendingRating = readPendingIntent(slug, false);
    if (pendingRating?.action === "rating" && pendingRating.score !== undefined) {
      const intent = createPendingRatingReviewIntent({
        slug,
        action: "rating",
        score: pendingRating.score,
        ...draft,
      });
      if (intent) storePendingIntent(intent);
      return;
    }
    if (!draft.title && !draft.body && !draft.isSpoiler) {
      clearStoredReviewDraft(slug);
      return;
    }
    const intent = createPendingRatingReviewIntent({ slug, action: "draft", ...draft });
    if (intent) storePendingIntent(intent);
  };

  useEffect(() => {
    if (isAuthenticated || guestDraftRestoredFor.current === slug) return;
    guestDraftRestoredFor.current = slug;
    const intent = readPendingIntent(slug, false);
    if (!intent) return;
    queueMicrotask(() => {
      setTitle(intent.draft.title);
      setBody(intent.draft.body);
      setIsSpoiler(intent.draft.isSpoiler);
    });
  }, [isAuthenticated, slug]);

  useEffect(() => {
    if (!isAuthenticated || replayStartedFor.current === slug) return;
    const intent = readPendingIntent(slug, true);
    if (!intent) return;
    replayStartedFor.current = slug;

    queueMicrotask(() => {
      const hasDraft = Boolean(intent.draft.title || intent.draft.body || intent.draft.isSpoiler);
      if (hasDraft || intent.action === "review" || intent.action === "draft") {
        setTitle(intent.draft.title);
        setBody(intent.draft.body);
        setIsSpoiler(intent.draft.isSpoiler);
      }

      if (intent.action === "draft") {
        toast({ tone: "info", message: "กู้คืนฉบับร่างแล้ว และยังไม่ได้ส่งรีวิว" });
        return;
      }

      if (intent.action === "rating" && intent.score !== undefined) {
        const score = intent.score;
        const previous = initialRating;
        setRating(score);
        startRatingTransition(async () => {
          try {
            await persistRating(slug, score);
            toast({ tone: "success", message: `บันทึกคะแนน ${score} ดาวหลังเข้าสู่ระบบแล้ว` });
            router.refresh();
          } catch {
            setRating(previous);
            toast({ tone: "error", message: "เข้าสู่ระบบแล้ว แต่บันทึกคะแนนที่ค้างไว้ไม่สำเร็จ กรุณาเลือกคะแนนอีกครั้ง" });
          }
        });
        return;
      }

      if (intent.action === "delete-review") {
        if (!initialReview) return;
        startReviewTransition(async () => {
          try {
            await persistReviewRemoval(slug);
            setReview(null);
            setTitle("");
            setBody("");
            setIsSpoiler(false);
            toast({ tone: "success", message: "ลบรีวิวที่ยืนยันไว้หลังเข้าสู่ระบบแล้ว" });
            router.refresh();
          } catch {
            toast({ tone: "error", message: "เข้าสู่ระบบแล้ว แต่ลบรีวิวที่ค้างไว้ไม่สำเร็จ กรุณาลองอีกครั้ง" });
          }
        });
        return;
      }

      if (intent.action === "review") {
        if (initialReview) {
          toast({
            tone: "info",
            message: "กู้คืนฉบับร่างแล้ว แต่ยังไม่ได้ส่ง เพราะบัญชีนี้มีรีวิวเดิม กรุณาตรวจสอบก่อนส่งอีกครั้ง",
          });
          return;
        }
        startReviewTransition(async () => {
          try {
            await persistReview(slug, intent.draft);
            setReview({
              title: intent.draft.title.trim() || null,
              body: intent.draft.body.trim(),
              isSpoiler: intent.draft.isSpoiler,
              status: "PENDING",
            });
            toast({ tone: "success", message: "ส่งรีวิวที่ยืนยันไว้หลังเข้าสู่ระบบแล้ว และกำลังรอการตรวจสอบ" });
            router.refresh();
          } catch {
            toast({ tone: "error", message: "เข้าสู่ระบบแล้ว แต่ส่งรีวิวที่ค้างไว้ไม่สำเร็จ ฉบับร่างยังอยู่ในแบบฟอร์ม" });
          }
        });
      }
    });
  }, [initialRating, initialReview, isAuthenticated, router, slug, toast]);

  const submitRating = (score: number) => {
    if (ratingPending) return;
    if (!isAuthenticated) {
      if (rememberLoginAction("rating", score)) setRating(score);
      return;
    }
    const previous = rating;
    setRating(score);
    startRatingTransition(async () => {
      try {
        await persistRating(slug, score);
        toast({ tone: "success", message: `บันทึกคะแนน ${score} ดาวแล้ว` });
        router.refresh();
      } catch (error) {
        if (error instanceof AuthenticationExpiredError) {
          if (!rememberLoginAction("rating", score)) setRating(previous);
          return;
        }
        setRating(previous);
        toast({ tone: "error", message: "บันทึกคะแนนไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  const submitReview = () => {
    if (reviewPending) return;
    if (body.trim().length < 20) {
      toast({ tone: "error", message: "รีวิวต้องมีอย่างน้อย 20 ตัวอักษร" });
      return;
    }
    if (!isAuthenticated) {
      rememberLoginAction("review");
      return;
    }

    const draft = { title, body, isSpoiler };
    startReviewTransition(async () => {
      try {
        await persistReview(slug, draft);
        clearStoredReviewDraft(slug);
        setReview({ title: draft.title.trim() || null, body: draft.body.trim(), isSpoiler: draft.isSpoiler, status: "PENDING" });
        toast({ tone: "success", message: "ส่งรีวิวแล้ว และกำลังรอการตรวจสอบ" });
        router.refresh();
      } catch (error) {
        if (error instanceof AuthenticationExpiredError) {
          rememberLoginAction("review");
          return;
        }
        toast({ tone: "error", message: "ส่งรีวิวไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  const removeReview = () => {
    if (reviewPending || !review) return;
    if (!isAuthenticated) {
      rememberLoginAction("draft");
      return;
    }
    startReviewTransition(async () => {
      try {
        await persistReviewRemoval(slug);
        setReview(null);
        setTitle("");
        setBody("");
        setIsSpoiler(false);
        clearStoredReviewDraft(slug);
        toast({ tone: "success", message: "ลบรีวิวแล้ว" });
        router.refresh();
      } catch (error) {
        if (error instanceof AuthenticationExpiredError) {
          rememberLoginAction("delete-review");
          return;
        }
        toast({ tone: "error", message: "ลบรีวิวไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <section className="border-y border-border py-5 lg:border-y-0">
        <p className="editorial-kicker">YOUR RATING</p>
        <h3 className="mt-1 font-serif text-xl font-semibold">ให้คะแนนเรื่องนี้</h3>
        <div className="mt-4">
          <div className="flex gap-1" role="group" aria-label="ให้คะแนน 1 ถึง 5 ดาว">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                disabled={ratingPending}
                onClick={() => submitRating(score)}
                aria-label={`${score} ดาว`}
                aria-pressed={rating === score}
                className="grid h-11 w-11 place-items-center rounded-[10px] hover:bg-muted disabled:cursor-wait"
              >
                <Star className={cn("h-6 w-6", rating && score <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">หนึ่งบัญชีให้คะแนนได้หนึ่งครั้ง และเปลี่ยนคะแนนภายหลังได้</p>
        </div>
      </section>

      <section className="border-y border-border py-5 lg:border-y-0 lg:border-l lg:pl-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-xl font-semibold">
            <span>{review ? "แก้ไขรีวิวของคุณ" : "เขียนรีวิว"}</span>
          </h3>
          {review ? <span className="text-xs font-medium text-muted-foreground">{statusLabel(review.status)}</span> : null}
        </div>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="review-title">หัวข้อ (ไม่บังคับ)</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setTitle(nextTitle);
                rememberDraftChange({ title: nextTitle, body, isSpoiler });
              }}
              maxLength={200}
              disabled={reviewPending}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="review-body">รีวิว</Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(event) => {
                const nextBody = event.target.value;
                setBody(nextBody);
                rememberDraftChange({ title, body: nextBody, isSpoiler });
              }}
              minLength={20}
              maxLength={5_000}
              disabled={reviewPending}
              placeholder="เล่าความเห็นของคุณอย่างสุภาพ อย่างน้อย 20 ตัวอักษร"
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(event) => {
                const nextIsSpoiler = event.target.checked;
                setIsSpoiler(nextIsSpoiler);
                rememberDraftChange({ title, body, isSpoiler: nextIsSpoiler });
              }}
              disabled={reviewPending}
            />
            มีเนื้อหาสปอยล์
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={submitReview} disabled={reviewPending}>
              {reviewPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{review ? "ส่งตรวจอีกครั้ง" : "ส่งรีวิว"}
            </Button>
            {review ? <Button type="button" variant="outline" onClick={removeReview} disabled={reviewPending}><Trash2 className="h-4 w-4" />ลบรีวิว</Button> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
