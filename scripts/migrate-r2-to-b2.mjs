import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import nextEnv from "@next/env";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const ALLOWED_PREFIXES = ["avatars/", "banners/", "covers/", "novels/assets/", "og/", "staging/"];
const DEFAULT_STATE_PATH = ".migration-state/r2-to-b2.jsonl";
const DEFAULT_MAX_OBJECT_BYTES = 16 * 1024 * 1024;

class MigrationConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "MigrationConflictError";
  }
}

function option(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : fallback;
}

function positiveInteger(value, name, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`--${name} must be a positive integer`);
  return parsed;
}

const execute = process.argv.includes("--execute");
const concurrency = positiveInteger(option("concurrency"), "concurrency", 12);
const limit = positiveInteger(option("limit"), "limit", Number.POSITIVE_INFINITY);
const maxObjectBytes = positiveInteger(option("max-object-bytes"), "max-object-bytes", DEFAULT_MAX_OBJECT_BYTES);
const statePath = path.resolve(option("state", DEFAULT_STATE_PATH));
const selectedPrefix = option("prefix");

if (concurrency > 32) throw new Error("--concurrency must be 32 or lower");
if (selectedPrefix && !ALLOWED_PREFIXES.includes(selectedPrefix)) {
  throw new Error(`--prefix must be one of: ${ALLOWED_PREFIXES.join(", ")}`);
}

const requiredEnvironment = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "B2_REGION",
  "B2_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_BUCKET_NAME",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());
if (missingEnvironment.length > 0) {
  throw new Error(`Missing migration environment: ${missingEnvironment.join(", ")}`);
}

const sourceBucket = process.env.R2_BUCKET_NAME.trim();
const destinationBucket = process.env.B2_BUCKET_NAME.trim();
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  maxAttempts: 5,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
  },
});
const b2 = new S3Client({
  region: process.env.B2_REGION.trim(),
  endpoint: `https://s3.${process.env.B2_REGION.trim()}.backblazeb2.com`,
  forcePathStyle: true,
  maxAttempts: 5,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID.trim(),
    secretAccessKey: process.env.B2_APPLICATION_KEY.trim(),
  },
});

function cleanEtag(etag) {
  return etag?.replaceAll('"', "") ?? null;
}

function fingerprint(object) {
  return [
    object.size,
    object.etag ?? "",
    object.lastModified ?? "",
  ].join(":");
}

function normalizeMetadata(metadata) {
  return Object.fromEntries(
    Object.entries(metadata ?? {})
      .map(([key, value]) => [key.toLowerCase(), value])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function responseBytes(response, expectedSize, key) {
  if (!response.Body) throw new Error(`Object body is missing for ${key}`);
  if (expectedSize > maxObjectBytes) {
    throw new Error(`Object exceeds --max-object-bytes for ${key}`);
  }
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  if (bytes.byteLength !== expectedSize) {
    throw new Error(`Object length changed while reading ${key}`);
  }
  return bytes;
}

async function listAll(client, bucket) {
  const objects = [];
  let continuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
      MaxKeys: 1_000,
      ...(selectedPrefix ? { Prefix: selectedPrefix } : {}),
    }));
    for (const item of page.Contents ?? []) {
      if (!item.Key) continue;
      if (!ALLOWED_PREFIXES.some((prefix) => item.Key.startsWith(prefix))) {
        throw new Error(`Refusing unexpected source object prefix: ${item.Key}`);
      }
      objects.push({
        key: item.Key,
        size: item.Size ?? 0,
        etag: cleanEtag(item.ETag),
        lastModified: item.LastModified?.toISOString() ?? null,
      });
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

async function destinationHead(key) {
  try {
    return await b2.send(new HeadObjectCommand({ Bucket: destinationBucket, Key: key }));
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") {
      return null;
    }
    throw error;
  }
}

async function loadState() {
  const state = new Map();
  try {
    const contents = await readFile(statePath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      if (record.status === "verified" && typeof record.key === "string") state.set(record.key, record);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return state;
}

let stateWrite = Promise.resolve();
function appendState(record) {
  stateWrite = stateWrite.then(() => appendFile(statePath, `${JSON.stringify(record)}\n`, "utf8"));
  return stateWrite;
}

function sourcePutInput(key, bytes, source) {
  return {
    Bucket: destinationBucket,
    Key: key,
    Body: bytes,
    ContentLength: bytes.byteLength,
    ...(source.ContentType ? { ContentType: source.ContentType } : {}),
    ...(source.CacheControl ? { CacheControl: source.CacheControl } : {}),
    ...(source.ContentDisposition ? { ContentDisposition: source.ContentDisposition } : {}),
    ...(source.ContentEncoding ? { ContentEncoding: source.ContentEncoding } : {}),
    ...(source.ContentLanguage ? { ContentLanguage: source.ContentLanguage } : {}),
    ...(source.Expires ? { Expires: source.Expires } : {}),
    ...(source.Metadata ? { Metadata: source.Metadata } : {}),
  };
}

function metadataMatches(source, destination) {
  if (source.ContentType && source.ContentType !== destination.ContentType) return false;
  if (source.ContentDisposition && source.ContentDisposition !== destination.ContentDisposition) return false;
  if (source.ContentEncoding && source.ContentEncoding !== destination.ContentEncoding) return false;
  if (source.ContentLanguage && source.ContentLanguage !== destination.ContentLanguage) return false;
  return JSON.stringify(normalizeMetadata(source.Metadata)) === JSON.stringify(normalizeMetadata(destination.Metadata));
}

async function verifyExisting(item, source) {
  const destination = await b2.send(new GetObjectCommand({ Bucket: destinationBucket, Key: item.key }));
  const [sourceBytes, destinationBytes] = await Promise.all([
    responseBytes(source, source.ContentLength ?? item.size, item.key),
    responseBytes(destination, destination.ContentLength ?? item.size, item.key),
  ]);
  const sourceHash = sha256(sourceBytes);
  const destinationHash = sha256(destinationBytes);
  if (sourceHash !== destinationHash || !metadataMatches(source, destination)) {
    throw new MigrationConflictError(`Destination object differs from R2: ${item.key}`);
  }
  return { sha256: sourceHash, versionId: destination.VersionId ?? null };
}

async function migrateObject(item, previousState) {
  const currentFingerprint = fingerprint(item);
  const head = await destinationHead(item.key);
  if (
    previousState?.sourceFingerprint === currentFingerprint
    && previousState?.sha256
    && head?.ContentLength === item.size
  ) {
    return { outcome: "checkpoint" };
  }

  const source = await r2.send(new GetObjectCommand({ Bucket: sourceBucket, Key: item.key }));
  const actualSize = source.ContentLength ?? item.size;
  if (actualSize > maxObjectBytes) throw new Error(`Object exceeds --max-object-bytes: ${item.key}`);
  const actualFingerprint = fingerprint({
    size: actualSize,
    etag: cleanEtag(source.ETag),
    lastModified: source.LastModified?.toISOString() ?? item.lastModified,
  });

  if (head) {
    const verified = await verifyExisting(item, source);
    await appendState({
      status: "verified",
      outcome: "existing",
      key: item.key,
      size: actualSize,
      sha256: verified.sha256,
      sourceFingerprint: actualFingerprint,
      destinationVersionId: verified.versionId,
      verifiedAt: new Date().toISOString(),
    });
    return { outcome: "existing" };
  }

  const sourceBytes = await responseBytes(source, actualSize, item.key);
  const sourceHash = sha256(sourceBytes);
  const uploaded = await b2.send(new PutObjectCommand(sourcePutInput(item.key, sourceBytes, source)));
  try {
    const destination = await b2.send(new GetObjectCommand({
      Bucket: destinationBucket,
      Key: item.key,
      ...(uploaded.VersionId ? { VersionId: uploaded.VersionId } : {}),
    }));
    const destinationBytes = await responseBytes(destination, actualSize, item.key);
    const destinationHash = sha256(destinationBytes);
    if (sourceHash !== destinationHash || !metadataMatches(source, destination)) {
      throw new Error(`Full verification failed: ${item.key}`);
    }
    await appendState({
      status: "verified",
      outcome: "copied",
      key: item.key,
      size: actualSize,
      sha256: sourceHash,
      sourceFingerprint: actualFingerprint,
      sourceEtag: cleanEtag(source.ETag),
      destinationEtag: cleanEtag(destination.ETag),
      destinationVersionId: uploaded.VersionId ?? destination.VersionId ?? null,
      verifiedAt: new Date().toISOString(),
    });
    return { outcome: "copied", bytes: actualSize };
  } catch (error) {
    if (uploaded.VersionId) {
      await b2.send(new DeleteObjectCommand({
        Bucket: destinationBucket,
        Key: item.key,
        VersionId: uploaded.VersionId,
      })).catch(() => undefined);
    }
    throw error;
  }
}

async function runWithRetries(item, previousState) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await migrateObject(item, previousState);
    } catch (error) {
      if (error instanceof MigrationConflictError) throw error;
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** (attempt - 1))));
    }
  }
  throw lastError;
}

async function main() {
  await mkdir(path.dirname(statePath), { recursive: true });
  const [sourceObjects, destinationObjects, state] = await Promise.all([
    listAll(r2, sourceBucket),
    listAll(b2, destinationBucket),
    loadState(),
  ]);
  const destinationByKey = new Map(destinationObjects.map((item) => [item.key, item]));
  const selected = sourceObjects.slice(0, limit);
  const totalBytes = selected.reduce((sum, item) => sum + item.size, 0);
  const missing = selected.filter((item) => !destinationByKey.has(item.key));
  const sizeMismatch = selected.filter((item) => {
    const destination = destinationByKey.get(item.key);
    return destination && destination.size !== item.size;
  });
  console.log(JSON.stringify({
    event: "inventory",
    mode: execute ? "execute" : "dry-run",
    sourceObjects: sourceObjects.length,
    selectedObjects: selected.length,
    selectedBytes: totalBytes,
    destinationObjects: destinationObjects.length,
    missingObjects: missing.length,
    sizeMismatchObjects: sizeMismatch.length,
    concurrency,
    statePath,
  }));
  if (!execute) return;

  const counters = { copied: 0, existing: 0, checkpoint: 0, failed: 0, conflicts: 0, copiedBytes: 0 };
  const failures = [];
  let nextIndex = 0;
  const startedAt = Date.now();
  let lastProgressAt = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= selected.length) return;
      const item = selected[index];
      try {
        const result = await runWithRetries(item, state.get(item.key));
        counters[result.outcome] += 1;
        counters.copiedBytes += result.bytes ?? 0;
      } catch (error) {
        if (error instanceof MigrationConflictError) counters.conflicts += 1;
        else counters.failed += 1;
        failures.push({
          key: item.key,
          name: error?.name ?? "Error",
          status: error?.$metadata?.httpStatusCode ?? null,
          message: String(error?.message ?? error).replace(/https?:\/\/\S+/g, "[url-redacted]"),
        });
      }
      const completed = counters.copied + counters.existing + counters.checkpoint + counters.failed + counters.conflicts;
      const now = Date.now();
      if (completed === selected.length || completed % 100 === 0 || now - lastProgressAt >= 15_000) {
        lastProgressAt = now;
        console.log(JSON.stringify({
          event: "progress",
          completed,
          total: selected.length,
          ...counters,
          elapsedSeconds: Math.round((now - startedAt) / 1_000),
        }));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, () => worker()));
  await stateWrite;
  const summary = {
    event: "summary",
    finishedAt: new Date().toISOString(),
    sourceObjects: sourceObjects.length,
    selectedObjects: selected.length,
    ...counters,
    failures,
    elapsedSeconds: Math.round((Date.now() - startedAt) / 1_000),
  };
  await writeFile(path.join(path.dirname(statePath), "r2-to-b2-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...summary, failures: failures.length }));
  if (counters.failed > 0 || counters.conflicts > 0) process.exitCode = 1;
}

try {
  await main();
} finally {
  r2.destroy();
  b2.destroy();
}
