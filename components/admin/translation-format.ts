const regularUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const fractionalUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const tinyUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

const translationDateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export function formatAiCost(costMicros: number, empty = "—") {
  if (costMicros <= 0) return empty;
  const dollars = costMicros / 1_000_000;
  return (dollars < 0.01 ? tinyUsdFormatter : dollars < 1 ? fractionalUsdFormatter : regularUsdFormatter).format(dollars);
}

export function formatTranslationDate(iso: string) {
  return translationDateFormatter.format(new Date(iso));
}

export function formatJobDuration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt) return "ยังไม่เริ่ม";
  if (!finishedAt) return "กำลังทำงาน";
  const seconds = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1_000));
  if (seconds < 60) return `${seconds} วินาที`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds ? `${minutes} นาที ${remainingSeconds} วินาที` : `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} ชม. ${remainingMinutes} นาที` : `${hours} ชม.`;
}
