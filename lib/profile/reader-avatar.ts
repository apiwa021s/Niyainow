import { ALLOWED_IMAGE_TYPES, type AllowedImageType } from "@/lib/validation/image-types";

export const READER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const READER_AVATAR_CONTENT_TYPES = ALLOWED_IMAGE_TYPES;

export function isReaderAvatarContentType(value: string): value is AllowedImageType {
  return READER_AVATAR_CONTENT_TYPES.includes(value as AllowedImageType);
}

export function validateReaderAvatarFile(file: Pick<File, "size" | "type">) {
  if (!isReaderAvatarContentType(file.type)) {
    return "รองรับเฉพาะ JPG, PNG, WebP และ AVIF";
  }
  if (file.size <= 0 || file.size > READER_AVATAR_MAX_BYTES) {
    return "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB";
  }
  return null;
}
