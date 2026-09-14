import { describe, expect, it } from "vitest";

import { missionCompletionPercent, missionPeriod } from "./reader-missions";

describe("reader mission periods", () => {
  it("uses Bangkok calendar days", () => {
    const period = missionPeriod("daily", new Date("2026-09-13T18:30:00.000Z"));
    expect(period.periodKey).toBe("2026-09-14");
    expect(period.start.toISOString()).toBe("2026-09-13T17:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-09-14T17:00:00.000Z");
  });

  it("starts weekly missions on Monday in Bangkok", () => {
    const period = missionPeriod("weekly", new Date("2026-09-16T05:00:00.000Z"));
    expect(period.periodKey).toBe("2026-09-14");
    expect(period.end.toISOString()).toBe("2026-09-20T17:00:00.000Z");
  });

  it("clamps mission progress percentages", () => {
    expect(missionCompletionPercent(2, 3)).toBe(67);
    expect(missionCompletionPercent(8, 3)).toBe(100);
  });
});
