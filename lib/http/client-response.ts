/** Extract the structured API message used by client-side admin forms. */
export async function responseMessage(response: Response) {
  const body = await response.json().catch(() => null) as {
    error?: { message?: string; fields?: Record<string, string[]> };
  } | null;
  const fieldLabels: Record<string, string> = {
    title: "ชื่อเรื่อง",
    titleOriginal: "ชื่อเรื่องต้นฉบับ",
    synopsis: "เรื่องย่อ",
    authorNames: "ผู้แต่ง",
    genreIds: "แนวนิยาย",
    tagNames: "แท็ก",
    contentRating: "ระดับเนื้อหา",
    heatLevel: "ระดับความเข้ม",
    contentWarningIds: "คำเตือนเนื้อหา",
    status: "สถานะเนื้อเรื่อง",
    publicationStatus: "การมองเห็น",
    coverKey: "ภาพปก",
    bannerKey: "ภาพแบนเนอร์",
    scheduledFor: "เวลาเผยแพร่",
  };
  const fieldMessages = body?.error?.fields
    ? Object.entries(body.error.fields).flatMap(([field, messages]) =>
        messages.map((message) => `${fieldLabels[field] ?? field}: ${message}`),
      )
    : [];
  const uniqueFieldMessages = [...new Set(fieldMessages)];
  return uniqueFieldMessages.join(" • ") || body?.error?.message || `Request failed (${response.status})`;
}
