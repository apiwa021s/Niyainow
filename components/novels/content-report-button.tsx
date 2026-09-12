"use client";

import { Flag } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const REPORT_REASONS = [
  { value: "INAPPROPRIATE_CONTENT", label: "เนื้อหาไม่เหมาะสม" },
  { value: "HARASSMENT_OR_HATE", label: "การคุกคามหรือสร้างความเกลียดชัง" },
  { value: "VIOLENCE_OR_SELF_HARM", label: "ความรุนแรงหรือการทำร้ายตนเอง" },
  { value: "COPYRIGHT", label: "ละเมิดลิขสิทธิ์" },
  { value: "SPAM_OR_MISLEADING", label: "สแปมหรือข้อมูลชวนให้เข้าใจผิด" },
  { value: "OTHER", label: "เหตุผลอื่น" },
] as const;

type ReportErrorPayload = {
  error?: { message?: string };
};

function currentCallbackPath(fallback: string) {
  try {
    const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
  } catch {
    return fallback;
  }
}

export function ContentReportButton({
  entityId,
  storySlug,
  storyTitle,
  isAuthenticated,
}: {
  entityId: string;
  storySlug: string;
  storyTitle: string;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectToLogin = () => {
    const fallback = pathname || `/novel/${storySlug}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(currentCallbackPath(fallback))}`);
  };

  const openReportForm = () => {
    if (!isAuthenticated) {
      toast({ tone: "info", message: "กรุณาเข้าสู่ระบบก่อนส่งรายงานเนื้อหา" });
      redirectToLogin();
      return;
    }
    setError("");
    setOpen(true);
  };

  const closeReportForm = () => {
    if (submitting) return;
    setOpen(false);
    setError("");
  };

  const submitReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason || submitting) return;

    const normalizedDetails = details.trim();
    if (reason === "OTHER" && !normalizedDetails) {
      setError("กรุณาระบุรายละเอียดของเหตุผลที่รายงาน");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "story",
          entityId,
          reason,
          details: normalizedDetails || null,
        }),
      });

      if (response.status === 401) {
        setOpen(false);
        toast({ tone: "info", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" });
        redirectToLogin();
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ReportErrorPayload | null;
        throw new Error(payload?.error?.message || "ส่งรายงานไม่สำเร็จ กรุณาลองอีกครั้ง");
      }

      setOpen(false);
      setReason("");
      setDetails("");
      toast({
        tone: "success",
        message: "ส่งรายงานแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด",
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ส่งรายงานไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openReportForm}
        className="bg-card/90 shadow-sm backdrop-blur-sm"
      >
        <Flag className="h-4 w-4" aria-hidden />
        รายงานเนื้อหา
      </Button>

      <Modal
        open={open}
        onClose={closeReportForm}
        title="รายงานเนื้อหา"
        description={`แจ้งปัญหาของเรื่อง “${storyTitle}” ทีมงานจะตรวจสอบรายงานและดำเนินการตามความเหมาะสม`}
        size="sm"
        dismissible={!submitting}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeReportForm} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button type="submit" form={formId} loading={submitting} disabled={!reason}>
              ส่งรายงาน
            </Button>
          </>
        }
      >
        <form id={formId} className="grid gap-4" onSubmit={(event) => void submitReport(event)}>
          <Field label="เหตุผลที่รายงาน">
            <Select
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
              required
              disabled={submitting}
              aria-label="เหตุผลที่รายงาน"
            >
              <option value="" disabled>เลือกเหตุผล</option>
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </Field>

          <Field
            label={reason === "OTHER" ? "รายละเอียด (จำเป็น)" : "รายละเอียดเพิ่มเติม (ไม่บังคับ)"}
            hint="ไม่เกิน 2,000 ตัวอักษร"
            error={error}
          >
            <Textarea
              value={details}
              onChange={(event) => {
                setDetails(event.target.value);
                setError("");
              }}
              maxLength={2_000}
              required={reason === "OTHER"}
              disabled={submitting}
              placeholder="อธิบายสิ่งที่พบเพื่อช่วยให้ทีมงานตรวจสอบได้เร็วขึ้น"
              aria-label="รายละเอียดเพิ่มเติม"
            />
          </Field>
          <p className="-mt-2 text-right text-xs tabular text-muted-foreground" aria-live="polite">
            {details.length.toLocaleString("th-TH")}/2,000
          </p>
        </form>
      </Modal>
    </>
  );
}
