"use client";

import { LoaderCircle, Star, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type InitialReview = {
  title: string | null;
  body: string;
  isSpoiler: boolean;
  status: "PENDING" | "PUBLISHED" | "HIDDEN" | "REJECTED";
} | null;

type ReviewStatus = NonNullable<InitialReview>["status"];

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

  const requireLogin = () => {
    if (isAuthenticated) return false;
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname || `/novel/${slug}`)}`);
    return true;
  };

  const submitRating = (score: number) => {
    if (requireLogin() || ratingPending) return;
    const previous = rating;
    setRating(score);
    startRatingTransition(async () => {
      try {
        const response = await fetch("/api/me/rating", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, score }),
        });
        if (!response.ok) throw new Error("rating_failed");
        toast({ tone: "success", message: `บันทึกคะแนน ${score} ดาวแล้ว` });
        router.refresh();
      } catch {
        setRating(previous);
        toast({ tone: "error", message: "บันทึกคะแนนไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  const submitReview = () => {
    if (requireLogin() || reviewPending) return;
    if (body.trim().length < 20) {
      toast({ tone: "error", message: "รีวิวต้องมีอย่างน้อย 20 ตัวอักษร" });
      return;
    }

    startReviewTransition(async () => {
      try {
        const response = await fetch("/api/me/reviews", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, title: title.trim() || null, body: body.trim(), isSpoiler }),
        });
        if (!response.ok) throw new Error("review_failed");
        setReview({ title: title.trim() || null, body: body.trim(), isSpoiler, status: "PENDING" });
        toast({ tone: "success", message: "ส่งรีวิวแล้ว และกำลังรอการตรวจสอบ" });
        router.refresh();
      } catch {
        toast({ tone: "error", message: "ส่งรีวิวไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  const removeReview = () => {
    if (requireLogin() || reviewPending || !review) return;
    startReviewTransition(async () => {
      try {
        const response = await fetch("/api/me/reviews", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        if (!response.ok) throw new Error("review_delete_failed");
        setReview(null);
        setTitle("");
        setBody("");
        setIsSpoiler(false);
        toast({ tone: "success", message: "ลบรีวิวแล้ว" });
        router.refresh();
      } catch {
        toast({ tone: "error", message: "ลบรีวิวไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader><CardTitle>ให้คะแนนเรื่องนี้</CardTitle></CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>{review ? "แก้ไขรีวิวของคุณ" : "เขียนรีวิว"}</span>
            {review ? <span className="text-xs font-medium text-muted-foreground">{statusLabel(review.status)}</span> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-1.5"><Label>หัวข้อ (ไม่บังคับ)</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} disabled={reviewPending} /></label>
          <label className="grid gap-1.5"><Label>รีวิว</Label><Textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={20} maxLength={5_000} disabled={reviewPending} placeholder="เล่าความเห็นของคุณอย่างสุภาพ อย่างน้อย 20 ตัวอักษร" /></label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isSpoiler} onChange={(event) => setIsSpoiler(event.target.checked)} disabled={reviewPending} />มีเนื้อหาสปอยล์</label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={submitReview} disabled={reviewPending}>
              {reviewPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{review ? "ส่งตรวจอีกครั้ง" : "ส่งรีวิว"}
            </Button>
            {review ? <Button type="button" variant="outline" onClick={removeReview} disabled={reviewPending}><Trash2 className="h-4 w-4" />ลบรีวิว</Button> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
