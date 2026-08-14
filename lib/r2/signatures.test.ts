import { describe, expect, it } from "vitest";

import { detectImageContentType, hasExpectedImageSignature } from "./signatures";

function ascii(value: string) {
  return new TextEncoder().encode(value);
}

describe("image magic-byte policy", () => {
  it.each([
    ["JPEG", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]), "image/jpeg"],
    ["PNG", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"],
    ["WebP", ascii("RIFF\u0000\u0000\u0000\u0000WEBP"), "image/webp"],
  ] as const)("detects %s", (_label, bytes, expected) => {
    expect(detectImageContentType(bytes)).toBe(expected);
  });

  it("detects AVIF when avif is a compatible BMFF brand", () => {
    const bytes = new Uint8Array(24);
    bytes.set([0, 0, 0, 24], 0);
    bytes.set(ascii("ftyp"), 4);
    bytes.set(ascii("mif1"), 8);
    bytes.set(ascii("avif"), 16);
    expect(detectImageContentType(bytes)).toBe("image/avif");
  });

  it("rejects spoofed metadata, SVG text, and truncated signatures", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(hasExpectedImageSignature(png, "image/jpeg")).toBe(false);
    expect(detectImageContentType(ascii("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(detectImageContentType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
