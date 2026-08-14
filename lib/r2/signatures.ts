import type { AllowedImageType } from "@/lib/validation/upload";

export const IMAGE_SIGNATURE_BYTES = 64;
export const IMAGE_SIGNATURE_RANGE = `bytes=0-${IMAGE_SIGNATURE_BYTES - 1}`;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  if (offset < 0 || bytes.length < offset + length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint32BigEndian(bytes: Uint8Array, offset: number) {
  if (bytes.length < offset + 4) return null;
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function isAvif(bytes: Uint8Array) {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return false;

  const size32 = uint32BigEndian(bytes, 0);
  if (size32 === null) return false;

  let brandOffset = 8;
  let declaredSize = size32;
  if (size32 === 1) {
    // Extended-size BMFF boxes use an unsigned 64-bit size. Reject values above
    // Number's safe range; a normal AVIF ftyp box is only a few dozen bytes.
    if (bytes.length < 24) return false;
    const high = uint32BigEndian(bytes, 8);
    const low = uint32BigEndian(bytes, 12);
    if (high === null || low === null || high > 0x1fffff) return false;
    declaredSize = high * 0x100000000 + low;
    brandOffset = 16;
  } else if (size32 !== 0 && size32 < 16) {
    return false;
  }

  const end = declaredSize === 0 ? bytes.length : Math.min(declaredSize, bytes.length);
  if (end < brandOffset + 8) return false;

  const isAvifBrand = (offset: number) => {
    const brand = ascii(bytes, offset, 4);
    return brand === "avif" || brand === "avis";
  };

  if (isAvifBrand(brandOffset)) return true;
  // Skip the four-byte minor version following the major brand.
  for (let offset = brandOffset + 8; offset + 4 <= end; offset += 4) {
    if (isAvifBrand(offset)) return true;
  }
  return false;
}

export function detectImageContentType(bytes: Uint8Array): AllowedImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (isAvif(bytes)) return "image/avif";
  return null;
}

export function hasExpectedImageSignature(bytes: Uint8Array, expected: AllowedImageType) {
  return detectImageContentType(bytes) === expected;
}
