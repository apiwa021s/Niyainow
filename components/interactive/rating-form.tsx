"use client";

import { Star } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import {
  createPendingRatingReviewIntent,
  readPendingRatingReviewIntent,
  storePendingRatingReviewIntent,
  type PendingRatingReviewIntent,
} from "@/lib/auth/pending-rating-review-intent";
import { cn } from "@/lib/utils";

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

function readPendingIntent(slug: string) {
  try {
    return readPendingRatingReviewIntent(window.sessionStorage, slug, true);
  } catch {
    return null;
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

export function RatingForm({
  slug,
  isAuthenticated,
  initialRating = null,
}: {
  slug: string;
  isAuthenticated: boolean;
  initialRating?: number | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [rating, setRating] = useState(initialRating);
  const [ratingPending, startRatingTransition] = useTransition();
  const replayStartedFor = useRef<string | null>(null);

  const rememberLoginRating = (score: number) => {
    const intent = createPendingRatingReviewIntent({
      slug,
      action: "rating",
      title: "",
      body: "",
      isSpoiler: false,
      score,
    });
    if (!intent || !storePendingIntent(intent)) {
      toast({
        tone: "error",
        message: "เบราว์เซอร์ไม่อนุญาตให้เก็บคะแนนชั่วคราว จึงยังไม่พาไปเข้าสู่ระบบเพื่อป้องกันข้อมูลหาย",
      });
      return false;
    }

    const fallback = pathname || `/novel/${slug}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(currentCallbackPath(fallback))}`);
    return true;
  };

  useEffect(() => {
    if (!isAuthenticated || replayStartedFor.current === slug) return;
    const intent = readPendingIntent(slug);
    replayStartedFor.current = slug;
    if (intent?.action !== "rating" || intent.score === undefined) return;

    const score = intent.score;
    const previous = initialRating;
    queueMicrotask(() => {
      setRating(score);
      startRatingTransition(async () => {
        try {
          await persistRating(slug, score);
          toast({ tone: "success", message: `บันทึกคะแนน ${score} ดาวหลังเข้าสู่ระบบแล้ว` });
          router.refresh();
        } catch {
          setRating(previous);
          toast({
            tone: "error",
            message: "เข้าสู่ระบบแล้ว แต่บันทึกคะแนนที่ค้างไว้ไม่สำเร็จ กรุณาเลือกคะแนนอีกครั้ง",
          });
        }
      });
    });
  }, [initialRating, isAuthenticated, router, slug, toast]);

  const submitRating = (score: number) => {
    if (ratingPending) return;
    if (!isAuthenticated) {
      if (rememberLoginRating(score)) setRating(score);
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
          if (!rememberLoginRating(score)) setRating(previous);
          return;
        }
        setRating(previous);
        toast({ tone: "error", message: "บันทึกคะแนนไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  return (
    <div className="max-w-lg border-y border-border py-5">
      <p className="editorial-kicker">YOUR RATING</p>
      <h3 className="mt-1 text-xl font-semibold">ให้คะแนนเรื่องนี้</h3>
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
              <Star
                aria-hidden="true"
                className={cn(
                  "h-6 w-6",
                  rating && score <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                )}
              />
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          หนึ่งบัญชีให้คะแนนได้หนึ่งครั้ง และเปลี่ยนคะแนนภายหลังได้
        </p>
      </div>
    </div>
  );
}
