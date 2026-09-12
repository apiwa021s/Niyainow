import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  extractGeneratedAlpha,
  resizeTransparentForExport,
  transparentWebpOptions,
} from "./lib/generated-art-alpha.mjs";
import { WORLD_ART_ASSETS } from "./world-art-spec.mjs";

const root = process.cwd();
const rawRoot = path.join(root, "art", "world", "raw");
const masterRoot = path.join(root, "art", "world", "masters");
const publicRoot = path.join(root, "public", "world");

const assets = WORLD_ART_ASSETS;

async function processAsset(asset) {
  const rawPath = path.join(rawRoot, `${asset.id}.png`);
  try {
    await fs.access(rawPath);
  } catch {
    return { id: asset.id, status: "missing" };
  }

  const masterPath = path.join(masterRoot, `${asset.id}.png`);
  const exportFolder = path.join(publicRoot, asset.folder);
  const exportPath = path.join(exportFolder, `${asset.id}.webp`);
  await fs.mkdir(masterRoot, { recursive: true });
  await fs.mkdir(exportFolder, { recursive: true });

  let pipeline;
  let extracted = false;
  let featherPixels = 0;
  if (asset.transparent) {
    const result = await extractGeneratedAlpha(rawPath, {
      outputWidth: asset.exportWidth,
      outputHeight: asset.exportHeight,
      minComponentPixels: asset.folder === "vfx" ? 0 : undefined,
      aggressiveEnclosedCheckerCleanup: asset.id.startsWith("env_tree_"),
    });
    extracted = result.extracted;
    featherPixels = result.featherPixels;
    pipeline = sharp(result.data, {
      raw: {
        width: result.info.width,
        height: result.info.height,
        channels: 4,
      },
    });
  } else {
    pipeline = sharp(rawPath);
  }

  await pipeline
    .resize(asset.masterWidth, asset.masterHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(masterPath);

  if (asset.transparent) {
    const resized = await resizeTransparentForExport(masterPath, asset.exportWidth, asset.exportHeight);
    await sharp(resized.data, {
      raw: { width: resized.info.width, height: resized.info.height, channels: 4 },
    }).webp(transparentWebpOptions()).toFile(exportPath);
  } else {
    await sharp(masterPath)
      .resize(asset.exportWidth, asset.exportHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 92, effort: 6, smartSubsample: true })
      .toFile(exportPath);
  }

  const metadata = await sharp(exportPath).metadata();
  const stats = await sharp(exportPath).stats();
  const alpha = stats.channels[3];
  return {
    id: asset.id,
    status: "built",
    size: `${metadata.width}x${metadata.height}`,
    alpha: alpha ? `${alpha.min}-${alpha.max}` : "opaque",
    extracted,
    featherPixels,
  };
}

const requestedIds = new Set(process.argv.slice(2));
const selectedAssets = requestedIds.size ? assets.filter((asset) => requestedIds.has(asset.id)) : assets;
const unknownIds = [...requestedIds].filter((id) => !assets.some((asset) => asset.id === id));
if (unknownIds.length) throw new Error(`Unknown world art asset IDs: ${unknownIds.join(", ")}`);

const results = [];
for (const asset of selectedAssets) results.push(await processAsset(asset));

for (const result of results.filter((entry) => entry.status === "built")) {
  console.info(`${result.id}: ${result.size}, alpha=${result.alpha}, extracted=${result.extracted}, feather=${result.featherPixels}`);
}
console.info(
  `World art build complete: ${results.filter((entry) => entry.status === "built").length} built, ${results.filter((entry) => entry.status === "missing").length} awaiting raw art.`,
);
