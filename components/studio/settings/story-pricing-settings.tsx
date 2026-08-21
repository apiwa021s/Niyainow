"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import type { StudioWork } from "@/components/studio/mock-data";
import { StudioPanel } from "@/components/studio/studio-ui";
import { useToast } from "@/components/ui/toast";
import { CHAPTER_PRICES } from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

const FREE_INTRO_MIN = 0;
const FREE_INTRO_MAX = 20;

/**
 * The default a new chapter is published with (spec §PART 5) — a writer with
 * hundreds of chapters should never have to re-decide a price they already
 * settled on. Overriding a single chapter still happens in the publish drawer.
 */
export function StoryPricingSettings({ work }: { work: StudioWork }) {
  const { toast } = useToast();
  const [access, setAccess] = useState<"free" | "paid">(work.defaultAccess);
  const [price, setPrice] = useState(work.defaultPrice);
  const [freeIntroCount, setFreeIntroCount] = useState(work.freeIntroChapterCount);

  const lastFreeChapter = freeIntroCount;
  const firstPaidChapter = freeIntroCount + 1;

  function save() {
    toast({ tone: "success", message: "บันทึกการตั้งราคาแล้ว" });
  }

  return (
    <div className="grid gap-4">
      <StudioPanel title="ราคาตอนใหม่" description="ใช้เป็นค่าเริ่มต้นทุกครั้งที่คุณเผยแพร่ตอนใหม่ — เปลี่ยนเฉพาะตอนได้ตอนกดเผยแพร่">
        <div className="grid gap-2 p-5">
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-4",
              access === "free" ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:border-[var(--brand-emphasis)]",
            )}
          >
            <input
              type="radio"
              name="default-access"
              checked={access === "free"}
              onChange={() => setAccess("free")}
              className="h-4.5 w-4.5 accent-[var(--brand-primary)]"
            />
            <span className="text-sm font-semibold">อ่านฟรี</span>
          </label>

          {CHAPTER_PRICES.map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-4",
                access === "paid" && price === value
                  ? "border-[var(--brand-emphasis)] bg-accent-subtle"
                  : "border-border bg-card hover:border-[var(--brand-emphasis)]",
              )}
            >
              <input
                type="radio"
                name="default-access"
                checked={access === "paid" && price === value}
                onChange={() => {
                  setAccess("paid");
                  setPrice(value);
                }}
                className="h-4.5 w-4.5 accent-[var(--brand-primary)]"
              />
              <span className="text-sm font-semibold">{value} Coins</span>
            </label>
          ))}
        </div>
      </StudioPanel>

      <StudioPanel title="ตอนฟรีเริ่มต้น" description="ให้ผู้อ่านใหม่ลองอ่านฟรีก่อนตัดสินใจติดตาม">
        <div className="grid gap-4 p-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFreeIntroCount((value) => Math.max(FREE_INTRO_MIN, value - 1))}
              disabled={freeIntroCount <= FREE_INTRO_MIN}
              aria-label="ลดจำนวนตอนฟรี"
              className="grid h-11 w-11 place-items-center rounded-(--r-md) border border-border text-(--text-secondary) hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="tabular-nums w-12 text-center text-xl font-semibold">{freeIntroCount}</span>
            <button
              type="button"
              onClick={() => setFreeIntroCount((value) => Math.min(FREE_INTRO_MAX, value + 1))}
              disabled={freeIntroCount >= FREE_INTRO_MAX}
              aria-label="เพิ่มจำนวนตอนฟรี"
              className="grid h-11 w-11 place-items-center rounded-(--r-md) border border-border text-(--text-secondary) hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-sm text-(--text-secondary)">ตอนแรก</span>
          </div>

          <div className="rounded-(--r-md) bg-muted/40 p-4 text-sm leading-7">
            {freeIntroCount > 0 ? (
              <>
                <p>
                  <span className="tabular-nums font-semibold">EP.01–EP.{String(lastFreeChapter).padStart(2, "0")}</span> อ่านฟรี
                </p>
                <p>
                  <span className="tabular-nums font-semibold">EP.{String(firstPaidChapter).padStart(2, "0")} เป็นต้นไป</span>{" "}
                  {access === "free" ? "อ่านฟรี" : `${price} Coins`}
                </p>
              </>
            ) : (
              <p className="text-(--text-secondary)">ทุกตอนใช้ราคาเริ่มต้นตั้งแต่ตอนแรก ไม่มีตอนทดลองอ่านฟรี</p>
            )}
          </div>
        </div>
      </StudioPanel>

      <button
        type="button"
        onClick={save}
        className="tap-target inline-flex h-11 w-fit items-center justify-center rounded-(--r-md) bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
      >
        บันทึกการตั้งราคา
      </button>
    </div>
  );
}
