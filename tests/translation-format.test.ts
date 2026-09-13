import { describe, expect, it } from "vitest";

import { formatAiCost, formatJobDuration } from "@/components/admin/translation-format";

describe("translation display formatting", () => {
  it("formats stored micro-dollar costs without hiding small values", () => {
    expect(formatAiCost(0)).toBe("—");
    expect(formatAiCost(500_435)).toBe("$0.5004");
    expect(formatAiCost(1_234)).toBe("$0.001234");
  });

  it("describes queued, running, short, and long job durations", () => {
    expect(formatJobDuration(null, null)).toBe("ยังไม่เริ่ม");
    expect(formatJobDuration("2026-09-13T00:00:00.000Z", null)).toBe("กำลังทำงาน");
    expect(formatJobDuration("2026-09-13T00:00:00.000Z", "2026-09-13T00:02:05.000Z")).toBe("2 นาที 5 วินาที");
    expect(formatJobDuration("2026-09-13T00:00:00.000Z", "2026-09-13T01:15:00.000Z")).toBe("1 ชม. 15 นาที");
  });
});
