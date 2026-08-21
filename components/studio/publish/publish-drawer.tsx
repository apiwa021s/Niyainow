"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { ChapterAccessSelector, type ChapterAccess } from "@/components/studio/publish/chapter-access-selector";
import { ChapterHeatOverride } from "@/components/studio/publish/chapter-heat-override";
import { ChapterWarningSelector } from "@/components/studio/publish/chapter-warning-selector";
import { FreeIntroRecommendation } from "@/components/studio/publish/free-intro-recommendation";
import { PublishConfirmationSummary, PublishSuccess } from "@/components/studio/publish/publish-confirmation";
import { PublishSchedulePicker, type PublishTiming } from "@/components/studio/publish/publish-schedule-picker";
import { baht, type StudioWork } from "@/components/studio/mock-data";
import { Button } from "@/components/ui/button";

const REVENUE_SHARE = 0.7;
const COIN_VALUE_BAHT = 1;

type Step = "form" | "confirm" | "success";

export function PublishDrawer({
  open,
  onClose,
  work,
  chapterNumber,
  chapterTitle,
  words,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  work: StudioWork;
  chapterNumber: number;
  chapterTitle: string;
  words: number;
  onPublished: () => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [access, setAccess] = useState<ChapterAccess>(work.defaultAccess);
  const [price, setPrice] = useState(work.defaultPrice);
  const [dismissedFreeRec, setDismissedFreeRec] = useState(false);
  const [timing, setTiming] = useState<PublishTiming>("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("20:00");
  const [heatOverrideEnabled, setHeatOverrideEnabled] = useState(false);
  const [heatOverrideLevel, setHeatOverrideLevel] = useState<number | null>(null);
  const [warningOverrideEnabled, setWarningOverrideEnabled] = useState(false);
  const [warningIds, setWarningIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const label = `EP.${String(chapterNumber).padStart(2, "0")}`;
  const isNewStory = work.chapters === 0;
  const showFreeRec = chapterNumber === 1 && access === "paid" && isNewStory && !dismissedFreeRec;
  const effectiveHeat = heatOverrideEnabled ? heatOverrideLevel ?? work.heatLevel : work.heatLevel;

  const priceLabel = access === "free" ? "อ่านฟรี" : `${price} Coins`;
  const heatLabel = `🔥 ระดับ ${effectiveHeat}`;
  const scheduleLabel =
    timing === "now"
      ? "เผยแพร่ทันที"
      : date
        ? `ตั้งเวลา ${date} · ${time}`
        : "ยังไม่ได้เลือกวันและเวลา";

  function reset() {
    setStep("form");
    setPublishing(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function goToConfirm() {
    setStep("confirm");
  }

  function confirmPublish() {
    setPublishing(true);
    window.setTimeout(() => {
      setPublishing(false);
      setStep("success");
      onPublished();
    }, 700);
  }

  function openPreview() {
    window.open(`/studio/works/${work.slug}/chapters/${chapterNumber}/preview`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60" onClick={step === "success" ? handleClose : onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`เผยแพร่ ${label}`}
        className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-[20px] border-t border-border bg-(--bg-elevated) shadow-[var(--sh-3)] sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[420px] sm:max-h-none sm:rounded-none sm:rounded-l-[16px] sm:border-t-0 sm:border-l"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{step === "form" ? `เผยแพร่ ${label}` : step === "confirm" ? "ยืนยันการเผยแพร่" : "เสร็จสิ้น"}</h2>
            {step === "form" ? (
              <p className="mt-0.5 truncate text-xs text-(--text-tertiary)">
                {chapterTitle} · {words.toLocaleString("th-TH")} คำ
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="ปิด"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === "form" ? (
            <div className="grid gap-6">
              <ChapterAccessSelector
                access={access}
                price={price}
                usualPrice={work.defaultPrice}
                onAccessChange={setAccess}
                onPriceChange={setPrice}
              />

              {access === "paid" ? (
                <div className="rounded-(--r-md) bg-muted/40 p-3 text-xs leading-6 text-(--text-secondary)">
                  {price} Coins · ผู้อ่านจ่ายประมาณ ฿{baht.format(price * COIN_VALUE_BAHT)} · รายได้สุทธิโดยประมาณ ฿
                  {baht.format(price * COIN_VALUE_BAHT * REVENUE_SHARE)}
                  <br />
                  <a href="/creators" target="_blank" rel="noreferrer" className="font-medium text-[var(--brand-emphasis)] underline-offset-4 hover:underline">
                    ดูรายละเอียดส่วนแบ่งรายได้
                  </a>
                </div>
              ) : null}

              {showFreeRec ? (
                <FreeIntroRecommendation onSwitchToFree={() => setAccess("free")} onDismiss={() => setDismissedFreeRec(true)} />
              ) : null}

              <hr className="border-border" />

              <PublishSchedulePicker
                timing={timing}
                date={date}
                time={time}
                onTimingChange={setTiming}
                onDateChange={setDate}
                onTimeChange={setTime}
              />

              <hr className="border-border" />

              <ChapterHeatOverride
                storyHeatLevel={work.heatLevel}
                overrideEnabled={heatOverrideEnabled}
                overrideLevel={heatOverrideLevel}
                onToggleOverride={(enabled) => {
                  setHeatOverrideEnabled(enabled);
                  if (enabled && heatOverrideLevel === null) setHeatOverrideLevel(work.heatLevel);
                }}
                onLevelChange={setHeatOverrideLevel}
              />

              <ChapterWarningSelector
                overrideEnabled={warningOverrideEnabled}
                selected={warningIds}
                onEnable={() => setWarningOverrideEnabled(true)}
                onToggle={(id) =>
                  setWarningIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
                }
              />
            </div>
          ) : null}

          {step === "confirm" ? (
            <PublishConfirmationSummary
              chapterLabel={label}
              chapterTitle={chapterTitle}
              priceLabel={priceLabel}
              heatLabel={heatLabel}
              scheduleLabel={scheduleLabel}
            />
          ) : null}

          {step === "success" ? (
            <PublishSuccess
              storySlug={work.slug}
              chapterNumber={chapterNumber}
              scheduled={timing === "schedule"}
              scheduleLabel={scheduleLabel.replace(/^ตั้งเวลา\s*/, "")}
              onClose={handleClose}
            />
          ) : null}
        </div>

        {step !== "success" ? (
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border p-4">
            {step === "form" ? (
              <>
                <Button variant="outline" onClick={openPreview} className="flex-1">
                  ดูตัวอย่าง
                </Button>
                <Button variant="primary" onClick={goToConfirm} className="flex-1" disabled={timing === "schedule" && !date}>
                  เผยแพร่ตอน
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                  แก้ไข
                </Button>
                <Button variant="primary" onClick={confirmPublish} loading={publishing} className="flex-1">
                  {timing === "schedule" ? "ยืนยันตั้งเวลา" : "เผยแพร่ตอน"}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
