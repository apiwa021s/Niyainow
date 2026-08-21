"use client";

import { ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * A cover is never a gate. A draft can exist with nothing but a title, so the
 * placeholder cover is a real option rather than a nag — writers who stall here
 * are the ones who never publish a first chapter.
 */
export function CoverUploader({
  previewUrl,
  onChange,
  onUsePlaceholder,
}: {
  previewUrl: string | null;
  onChange: (url: string | null, fileName: string | null) => void;
  onUsePlaceholder: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG และ WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("ไฟล์ใหญ่เกิน 5 MB ลองย่อขนาดก่อนอัปโหลด");
      return;
    }
    setError(null);
    onChange(URL.createObjectURL(file), file.name);
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div
        className={cn(
          "grid aspect-2/3 w-32 shrink-0 place-items-center overflow-hidden rounded-xl border",
          previewUrl ? "border-border" : "border-dashed border-border bg-muted/40",
        )}
      >
        {previewUrl ? (
          // Object URL from the file the writer just picked — next/image adds
          // nothing here and cannot optimise a blob anyway.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="ตัวอย่างปกที่เลือก" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="grid place-items-center text-(--text-tertiary)">
            <ImagePlus className="h-6 w-6" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="เลือกไฟล์ปกนิยาย"
          onChange={(event) => pick(event.target.files?.[0])}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <ImagePlus aria-hidden className="h-4 w-4" />
            อัปโหลดปก
          </Button>
          {previewUrl ? (
            <Button type="button" variant="ghost" onClick={() => onChange(null, null)}>
              <Trash2 aria-hidden className="h-4 w-4" />
              เอาปกออก
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onUsePlaceholder}>
              <Sparkles aria-hidden className="h-4 w-4" />
              ใช้ปกชั่วคราว
            </Button>
          )}
        </div>

        <p className="mt-2 text-xs leading-6 text-(--text-tertiary)">
          แนวตั้งอัตราส่วน 2:3 (แนะนำ 800×1200 พิกเซล) รองรับ JPG, PNG, WEBP ไม่เกิน 5 MB
          <br />
          ยังไม่มีปกก็สร้างเรื่องได้ กลับมาเปลี่ยนทีหลังได้ตลอด
        </p>

        {error ? (
          <p role="alert" className="mt-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
