import type { MembershipStatus } from "@/db/schema";

export function isMembershipEntitled(input: {
  status: MembershipStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  now: Date;
}) {
  return (input.status === "active" || input.status === "cancel_at_period_end")
    && input.currentPeriodStart <= input.now
    && input.now < input.currentPeriodEnd;
}