import { z } from "zod";

export const ASSET_TYPES = ["cover", "banner", "avatar", "novelAsset", "og"] as const;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const APPROVED_OBJECT_KEY_PREFIXES = ["covers/", "banners/", "avatars/", "novels/assets/", "og/"] as const;
export const STAGING_OBJECT_KEY_PREFIX = "staging/" as const;
export const MANAGED_OBJECT_KEY_PREFIXES = [...APPROVED_OBJECT_KEY_PREFIXES, STAGING_OBJECT_KEY_PREFIX] as const;

export type AssetType = (typeof ASSET_TYPES)[number];
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_UPLOAD_BYTES: Record<AssetType, number> = {
  cover: 8 * 1024 * 1024,
  banner: 12 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
  novelAsset: 12 * 1024 * 1024,
  og: 8 * 1024 * 1024,
};

const EXTENSIONS_BY_MIME: Record<AllowedImageType, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
};

export const uploadRequestSchema = z
  .object({
    assetType: z.enum(ASSET_TYPES),
    originalFileName: z.string().trim().min(1).max(255),
    contentType: z.enum(ALLOWED_IMAGE_TYPES),
    contentLength: z.number().int().positive(),
    checksumSha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/, "Expected a base64-encoded SHA-256 checksum").optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.contentLength > MAX_UPLOAD_BYTES[input.assetType]) {
      context.addIssue({
        code: "custom",
        path: ["contentLength"],
        message: `${input.assetType} uploads must be ${MAX_UPLOAD_BYTES[input.assetType]} bytes or smaller`,
      });
    }

    const extension = input.originalFileName.split(".").pop()?.toLowerCase();
    if (!extension || !EXTENSIONS_BY_MIME[input.contentType].includes(extension)) {
      context.addIssue({
        code: "custom",
        path: ["originalFileName"],
        message: `Filename extension does not match ${input.contentType}`,
      });
    }
  });

export type ValidatedUploadRequest = z.infer<typeof uploadRequestSchema>;

export const objectKeySchema = z
  .string()
  .min(1)
  .max(512)
  .refine((key) => !key.includes("://"), "Object key must not be a URL")
  .refine((key) => !key.startsWith("/") && !key.includes("\\"), "Object key must be a relative POSIX path")
  .refine((key) => !key.split("/").includes(".."), "Object key must not traverse directories")
  .regex(
    /^(?:covers|banners|avatars|novels\/assets|og)\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/,
    "Object key must use an approved media prefix, UUID, and image extension",
  );

export const stagingObjectKeySchema = z
  .string()
  .min(1)
  .max(520)
  .regex(
    /^staging\/(?:covers|banners|avatars|novels\/assets|og)\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/,
    "Staging key must map to an approved final media key",
  );

export const managedObjectKeySchema = z.union([objectKeySchema, stagingObjectKeySchema]);

const PREFIX_BY_ASSET: Record<AssetType, string> = {
  cover: "covers",
  banner: "banners",
  avatar: "avatars",
  novelAsset: "novels/assets",
  og: "og",
};

const CANONICAL_EXTENSION: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function validateUploadRequest(input: unknown) {
  return uploadRequestSchema.parse(input);
}

export function generateObjectKey(input: Pick<ValidatedUploadRequest, "assetType" | "contentType">) {
  const key = `${PREFIX_BY_ASSET[input.assetType]}/${crypto.randomUUID()}.${CANONICAL_EXTENSION[input.contentType]}`;
  return objectKeySchema.parse(key);
}

export function generateStagingObjectKey(finalObjectKeyInput: string) {
  const finalObjectKey = objectKeySchema.parse(finalObjectKeyInput);
  return stagingObjectKeySchema.parse(`${STAGING_OBJECT_KEY_PREFIX}${finalObjectKey}`);
}
