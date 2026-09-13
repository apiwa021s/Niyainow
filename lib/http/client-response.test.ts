import { describe, expect, it } from "vitest";

import { responseMessage } from "./client-response";

describe("responseMessage", () => {
  it("shows every validation field with a readable Thai label", async () => {
    const response = Response.json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        fields: {
          synopsis: ["Too small: expected string to have >=20 characters"],
          authorNames: ["Too small: expected array to have >=1 items"],
        },
      },
    }, { status: 400 });

    await expect(responseMessage(response)).resolves.toBe(
      "เรื่องย่อ: Too small: expected string to have >=20 characters • ผู้แต่ง: Too small: expected array to have >=1 items",
    );
  });
});
