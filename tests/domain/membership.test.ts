import { describe, expect, it } from "vitest";

import { isMembershipEntitled } from "@/lib/domain/membership";

const start = new Date("2026-08-01T00:00:00.000Z");
const end = new Date("2026-09-01T00:00:00.000Z");

describe("isMembershipEntitled", () => {
  it("keeps cancelled-at-period-end access until the exclusive end boundary", () => {
    expect(isMembershipEntitled({ status: "cancel_at_period_end", currentPeriodStart: start, currentPeriodEnd: end, now: new Date("2026-08-31T23:59:59.999Z") })).toBe(true);
    expect(isMembershipEntitled({ status: "cancel_at_period_end", currentPeriodStart: start, currentPeriodEnd: end, now: end })).toBe(false);
  });

  it("rejects inactive statuses and future periods", () => {
    expect(isMembershipEntitled({ status: "cancelled", currentPeriodStart: start, currentPeriodEnd: end, now: start })).toBe(false);
    expect(isMembershipEntitled({ status: "active", currentPeriodStart: start, currentPeriodEnd: end, now: new Date("2026-07-31T23:59:59.999Z") })).toBe(false);
  });
});