import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { extractGeneratedAlpha } from "./lib/generated-art-alpha.mjs";
import { WORLD_ART_ASSETS, WORLD_CHARACTER_EXPORTS } from "./world-art-spec.mjs";

const root = process.cwd();
const publicRoot = path.join(root, "public", "world");
const rawRoot = path.join(root, "art", "world", "raw");
const expectedAssets = [...WORLD_ART_ASSETS, ...WORLD_CHARACTER_EXPORTS];
const maximumTotalBytes = 12 * 1024 * 1024;
const maximumAssetBytes = 2 * 1024 * 1024;
const failures = [];
let totalBytes = 0;

for (const asset of expectedAssets) {
  const filePath = path.join(publicRoot, asset.folder, `${asset.id}.webp`);
  let file;
  try {
    file = await fs.stat(filePath);
  } catch {
    failures.push(`${asset.id}: export is missing`);
    continue;
  }
  totalBytes += file.size;
  if (file.size > maximumAssetBytes) failures.push(`${asset.id}: ${file.size} bytes exceeds the 2 MiB per-asset budget`);

  const image = sharp(filePath).ensureAlpha();
  const metadata = await image.metadata();
  if (metadata.format !== "webp") failures.push(`${asset.id}: expected WebP, received ${metadata.format}`);
  if (metadata.width !== asset.exportWidth || metadata.height !== asset.exportHeight) {
    failures.push(`${asset.id}: expected ${asset.exportWidth}x${asset.exportHeight}, received ${metadata.width}x${metadata.height}`);
  }

  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let minimumAlpha = 255;
  let maximumAlpha = 0;
  let visiblePixels = 0;
  let hiddenRgbPixels = 0;
  let subThresholdPixels = 0;
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const offset = pixel * 4;
    const alpha = data[offset + 3];
    minimumAlpha = Math.min(minimumAlpha, alpha);
    maximumAlpha = Math.max(maximumAlpha, alpha);
    if (alpha !== 0) visiblePixels += 1;
    if (alpha === 0 && (data[offset] !== 0 || data[offset + 1] !== 0 || data[offset + 2] !== 0)) hiddenRgbPixels += 1;
    if (alpha > 0 && alpha <= 8) subThresholdPixels += 1;
  }

  if (asset.transparent) {
    if (minimumAlpha !== 0 || maximumAlpha !== 255) {
      failures.push(`${asset.id}: transparent asset alpha range is ${minimumAlpha}-${maximumAlpha}`);
    }
    if (visiblePixels === 0 || visiblePixels === info.width * info.height) {
      failures.push(`${asset.id}: transparent asset has invalid visible coverage`);
    }
    if (hiddenRgbPixels) failures.push(`${asset.id}: ${hiddenRgbPixels} fully transparent pixels retain RGB matte data`);
    if (subThresholdPixels) failures.push(`${asset.id}: ${subThresholdPixels} pixels remain below the alpha cleanup threshold`);

    if (asset.id.startsWith("env_tree_")) {
      const extracted = await extractGeneratedAlpha(path.join(rawRoot, `${asset.id}.png`), {
        outputWidth: asset.exportWidth,
        outputHeight: asset.exportHeight,
        aggressiveEnclosedCheckerCleanup: true,
      });
      const expected = await sharp(extracted.data, {
        raw: { width: extracted.info.width, height: extracted.info.height, channels: 4 },
      })
        .resize(asset.exportWidth, asset.exportHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
        .raw()
        .toBuffer();
      let opaqueCheckerLeaks = 0;
      for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
        if (expected[pixel * 4 + 3] <= 8 && data[pixel * 4 + 3] >= 128) opaqueCheckerLeaks += 1;
      }
      if (opaqueCheckerLeaks > 8) {
        failures.push(`${asset.id}: ${opaqueCheckerLeaks} opaque pixels disagree with the checker-background extraction mask`);
      }
    }
  } else if (minimumAlpha !== 255 || maximumAlpha !== 255) {
    failures.push(`${asset.id}: opaque texture unexpectedly contains transparency`);
  }

  console.info(`${asset.id}: ${metadata.width}x${metadata.height}, ${(file.size / 1024).toFixed(1)} KiB, alpha=${minimumAlpha}-${maximumAlpha}`);
}

if (totalBytes > maximumTotalBytes) {
  failures.push(`world art payload ${(totalBytes / 1024 / 1024).toFixed(2)} MiB exceeds the 12 MiB release budget`);
}
if (failures.length) {
  console.error("World art audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.info(`World art audit passed: ${expectedAssets.length} assets, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB total.`);
}
