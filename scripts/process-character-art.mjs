import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  extractGeneratedAlpha,
  resizeTransparentForExport,
  transparentWebpOptions,
} from "./lib/generated-art-alpha.mjs";

const root = process.cwd();
const assetId = "character_default_idle_001";
const rawPath = path.join(root, "art", "world", "characters", "raw", `${assetId}.png`);
const masterRoot = path.join(root, "art", "world", "characters", "masters");
const reviewRoot = path.join(root, "art", "world", "characters", "review");
const publicRoot = path.join(root, "public", "world", "characters", "composite");
const masterPath = path.join(masterRoot, `${assetId}.png`);
const exportPath = path.join(publicRoot, `${assetId}.webp`);
const reviewPath = path.join(reviewRoot, `${assetId}-registration.png`);

const directions = ["NE", "NW", "SE", "SW"];
const sourceFrame = { width: 512, height: 768 };
const masterFrame = { width: 512, height: 768 };
const exportFrame = { width: 128, height: 192 };
const footBaseline = Math.round(masterFrame.height * 0.92);
const topSafeLine = 24;
const horizontalSafePadding = 28;

function alphaBounds(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 12) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error("Character frame has no visible pixels.");
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function build() {
  await Promise.all([
    fs.mkdir(masterRoot, { recursive: true }),
    fs.mkdir(reviewRoot, { recursive: true }),
    fs.mkdir(publicRoot, { recursive: true }),
  ]);

  const alpha = await extractGeneratedAlpha(rawPath, {
    outputWidth: exportFrame.width * directions.length,
    outputHeight: exportFrame.height,
  });
  if (alpha.info.width !== sourceFrame.width * directions.length || alpha.info.height !== sourceFrame.height) {
    throw new Error(`Expected a ${sourceFrame.width * directions.length}x${sourceFrame.height} four-direction source atlas.`);
  }

  const source = sharp(alpha.data, {
    raw: { width: alpha.info.width, height: alpha.info.height, channels: 4 },
  });
  const frames = [];
  for (let index = 0; index < directions.length; index += 1) {
    const { data, info } = await source.clone()
      .extract({ left: index * sourceFrame.width, top: 0, ...sourceFrame })
      .raw()
      .toBuffer({ resolveWithObject: true });
    frames.push({ data, info, bounds: alphaBounds(data, info.width, info.height) });
  }

  const maximumHeight = Math.max(...frames.map((frame) => frame.bounds.height));
  const maximumWidth = Math.max(...frames.map((frame) => frame.bounds.width));
  const commonScale = Math.min(
    (footBaseline - topSafeLine) / maximumHeight,
    (masterFrame.width - horizontalSafePadding * 2) / maximumWidth,
    1,
  );

  const registeredFrames = [];
  const registrations = [];
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const outputWidth = Math.max(1, Math.round(frame.bounds.width * commonScale));
    const outputHeight = Math.max(1, Math.round(frame.bounds.height * commonScale));
    const cutout = await sharp(frame.data, {
      raw: { width: frame.info.width, height: frame.info.height, channels: 4 },
    })
      .extract(frame.bounds)
      .resize(outputWidth, outputHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();
    const left = Math.round((masterFrame.width - outputWidth) / 2);
    const top = footBaseline - outputHeight;
    registeredFrames.push(await sharp({
      create: { width: masterFrame.width, height: masterFrame.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite([{ input: cutout, left, top }]).png().toBuffer());
    registrations.push({ direction: directions[index], left, top, width: outputWidth, height: outputHeight });
  }

  await sharp({
    create: {
      width: masterFrame.width * directions.length,
      height: masterFrame.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(registeredFrames.map((input, index) => ({ input, left: index * masterFrame.width, top: 0 })))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(masterPath);

  const exportWidth = exportFrame.width * directions.length;
  const resized = await resizeTransparentForExport(masterPath, exportWidth, exportFrame.height);
  await sharp(resized.data, {
    raw: { width: resized.info.width, height: resized.info.height, channels: 4 },
  })
    // Lossless/exact avoids colored chroma blocks around fine manga ink at sprite scale.
    .webp(transparentWebpOptions())
    .toFile(exportPath);

  const guide = Buffer.from(`<svg width="${masterFrame.width * directions.length}" height="${masterFrame.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#2f292d"/>
    <rect y="384" width="100%" height="384" fill="#f6eddd"/>
    ${directions.map((direction, index) => `<rect x="${index * masterFrame.width}" width="${masterFrame.width}" height="${masterFrame.height}" fill="none" stroke="#b99155" stroke-width="2"/><text x="${index * masterFrame.width + 22}" y="42" fill="#b99155" font-family="sans-serif" font-size="24" font-weight="700">${direction}</text>`).join("")}
    <line x1="0" y1="${footBaseline}" x2="${masterFrame.width * directions.length}" y2="${footBaseline}" stroke="#c54b61" stroke-width="3"/>
  </svg>`);
  await sharp(guide).composite([{ input: await fs.readFile(masterPath), left: 0, top: 0 }]).png().toFile(reviewPath);

  const stats = await sharp(exportPath).stats();
  const metadata = await sharp(exportPath).metadata();
  console.info(`${assetId}: ${metadata.width}x${metadata.height}, frames=${directions.join(",")}, anchor=(0.5,0.92), alpha=${stats.channels[3]?.min}-${stats.channels[3]?.max}, extracted=${alpha.extracted}`);
  for (const registration of registrations) console.info(registration);
}

await build();
