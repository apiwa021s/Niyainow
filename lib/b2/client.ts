import { S3Client } from "@aws-sdk/client-s3";

import { requireB2Env } from "@/lib/env";

declare global {
  var __niyainowB2Client: S3Client | undefined;
}

export function getB2Client() {
  if (globalThis.__niyainowB2Client) return globalThis.__niyainowB2Client;

  const env = requireB2Env();
  const client = new S3Client({
    region: env.B2_REGION,
    endpoint: `https://s3.${env.B2_REGION}.backblazeb2.com`,
    // Path-style addressing also works for bucket names containing dots, which
    // cannot use Backblaze's wildcard TLS certificate as virtual hostnames.
    forcePathStyle: true,
    // Newer AWS SDK releases otherwise sign an empty-body CRC32 when PutObject
    // has no Body (as is normal for presigning), which rejects the browser's
    // later non-empty PUT. Only explicit caller-provided checksums are signed.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.B2_KEY_ID,
      secretAccessKey: env.B2_APPLICATION_KEY,
    },
  });

  globalThis.__niyainowB2Client = client;
  return client;
}

export function destroyB2Client() {
  globalThis.__niyainowB2Client?.destroy();
  globalThis.__niyainowB2Client = undefined;
}
