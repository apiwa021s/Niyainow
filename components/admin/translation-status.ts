const TRANSLATION_STATUS_LABELS: Record<string, string> = {
  SETUP: "กำลังเตรียมแนวทางการแปล",
  READY: "พร้อมเริ่มแปล",
  TRANSLATING: "กำลังแปล",
  REVIEW: "รอตรวจและอนุมัติ",
  QA_FAILED: "ต้องแก้ไข",
  APPROVED: "พร้อมเผยแพร่",
  PUBLISHED: "เผยแพร่แล้ว",
  COMPLETED: "เสร็จแล้ว",
  FAILED: "ทำงานไม่สำเร็จ",
  STALE: "ต้นฉบับมีการเปลี่ยนแปลง",
  DRAFT: "ฉบับร่าง",
  QUEUED: "รอเริ่มงาน",
  RUNNING: "กำลังทำงาน",
  CANCELLED: "ยกเลิกแล้ว",
  SUPERSEDED: "ฉบับเก่า",
};

export function translationStatusLabel(status: string) {
  return TRANSLATION_STATUS_LABELS[status] ?? status;
}

export function translationStatusTone(status: string): "success" | "danger" | "warning" | "info" | "neutral" {
  if (["PUBLISHED", "COMPLETED"].includes(status)) return "success";
  if (["FAILED", "QA_FAILED"].includes(status)) return "danger";
  if (["APPROVED", "REVIEW", "STALE"].includes(status)) return "warning";
  if (["TRANSLATING", "QUEUED", "RUNNING"].includes(status)) return "info";
  return "neutral";
}

export function translationNextAction(status: string, publishReady: number, needsReview: number, total: number) {
  if (status === "SETUP") return "ตั้งค่าแนวทางการแปลให้เสร็จ";
  if (status === "TRANSLATING") return "ติดตามงานที่กำลังแปล";
  if (status === "FAILED") return "ตรวจข้อผิดพลาดและลองใหม่";
  if (needsReview > 0) return `ตรวจ ${needsReview.toLocaleString("th-TH")} ตอนที่ต้องจัดการ`;
  if (publishReady > 0) return `เผยแพร่ ${publishReady.toLocaleString("th-TH")} ตอนที่พร้อม`;
  if (total > 0) return "เลือกตอนเพื่อเริ่มแปล";
  return "ซิงก์ตอนจากต้นฉบับ";
}
