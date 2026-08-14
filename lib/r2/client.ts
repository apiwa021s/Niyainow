import { S3Client } from "@aws-sdk/client-s3";

import { requireR2Env } from "@/lib/env";

declare global {
  var __niyainowR2Client: S3Client | undefined;
}

export function getR2Client() {
  if (globalThis.__niyainowR2Client) return globalThis.__niyainowR2Client;

  const env = requireR2Env();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    // Newer AWS SDK releases otherwise sign an empty-body CRC32 when PutObject
    // has no Body (as is normal for presigning), which rejects the browser's
    // later non-empty PUT. Only explicit caller-provided checksums are signed.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  globalThis.__niyainowR2Client = client;
  return client;
}

export function destroyR2Client() {
  globalThis.__niyainowR2Client?.destroy();
  globalThis.__niyainowR2Client = undefined;
}
