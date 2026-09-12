import { describe, expect, it } from "vitest";

import { translationNextAction, translationStatusLabel, translationStatusTone } from "@/components/admin/translation-status";

describe("translation UX labels", () => {
  it("shows reader-friendly Thai labels for workflow states", () => {
    expect(translationStatusLabel("QA_FAILED")).toBe("ต้องแก้ไข");
    expect(translationStatusLabel("APPROVED")).toBe("พร้อมเผยแพร่");
    expect(translationStatusLabel("PUBLISHED")).toBe("เผยแพร่แล้ว");
  });

  it("maps workflow states to consistent tones and next actions", () => {
    expect(translationStatusTone("QA_FAILED")).toBe("danger");
    expect(translationStatusTone("TRANSLATING")).toBe("info");
    expect(translationNextAction("READY", 12, 0, 20)).toContain("12");
  });
});
