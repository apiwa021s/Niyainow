import { Check, Share2 } from "lucide-react";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";

export function PublishConfirmationSummary({
  chapterLabel,
  chapterTitle,
  priceLabel,
  heatLabel,
  scheduleLabel,
}: {
  chapterLabel: string;
  chapterTitle: string;
  priceLabel: string;
  heatLabel: string;
  scheduleLabel: string;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-(--text-secondary)">พร้อมเผยแพร่</p>
      <div>
        <p className="tabular-nums text-sm font-semibold text-brand-primary">{chapterLabel}</p>
        <p className="mt-0.5 text-lg font-semibold">{chapterTitle}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--text-secondary)">
        <span>{priceLabel}</span>
        <span>{heatLabel}</span>
      </div>
      <p className="text-sm font-medium">{scheduleLabel}</p>
    </div>
  );
}

export function PublishSuccess({
  storySlug,
  chapterNumber,
  scheduled,
  scheduleLabel,
  onClose,
}: {
  storySlug: string;
  chapterNumber: number;
  scheduled: boolean;
  scheduleLabel?: string;
  onClose: () => void;
}) {
  const label = `EP.${String(chapterNumber).padStart(2, "0")}`;

  return (
    <div className="grid justify-items-center gap-3 py-6 text-center">
      <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-accent-subtle text-brand-primary">
        <Check className="h-7 w-7" />
      </span>
      {scheduled ? (
        <>
          <h2 className="text-xl font-semibold">ตั้งเวลาเรียบร้อย</h2>
          <p className="max-w-xs leading-7 text-(--text-secondary)">
            {label} จะเผยแพร่วันที่ {scheduleLabel}
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold">เผยแพร่ {label} แล้ว</h2>
          <p className="max-w-xs leading-7 text-(--text-secondary)">ตอนใหม่ของคุณพร้อมให้ผู้อ่านแล้ว</p>
        </>
      )}

      <div className="mt-2 grid w-full gap-2">
        {!scheduled ? (
          <>
            <ButtonLink href={`/novel/${storySlug}/chapter/${chapterNumber}`} variant="primary">
              ดูตอนที่เผยแพร่
            </ButtonLink>
            <Button variant="outline" onClick={onClose}>
              <Share2 aria-hidden className="h-4 w-4" />
              แชร์ตอน
            </Button>
          </>
        ) : null}
        <Link
          href={`/studio/works/${storySlug}`}
          onClick={onClose}
          className="inline-flex min-h-11 items-center justify-center rounded-(--r-md) text-sm font-semibold text-(--text-secondary) hover:text-(--text-primary)"
        >
          กลับ Dashboard
        </Link>
      </div>
    </div>
  );
}
