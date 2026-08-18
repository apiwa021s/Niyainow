import { describe, expect, it } from "vitest";

import { displayTagName } from "@/lib/domain/tag";

describe("displayTagName", () => {
  it("keeps presentation hashes out of the stored label", () => {
    expect(displayTagName("#ย้อนยุค80")).toBe("ย้อนยุค80");
    expect(displayTagName("## เกิดใหม่ ")).toBe("เกิดใหม่");
    expect(displayTagName("แฟนตาซี")).toBe("แฟนตาซี");
  });
});
