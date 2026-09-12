import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const rawRoot = path.join(root, "art", "world", "raw");
const masterRoot = path.join(root, "art", "world", "masters");
const publicRoot = path.join(root, "public", "world");

const assets = [
  ["ground_grass_001", "ground", 1024, 1024, 512, 512, false],
  ["ground_plaza_stone_001", "ground", 1024, 1024, 512, 512, false],
  ["ground_path_straight_001", "ground", 1024, 1024, 512, 512, true],
  ["ground_path_corner_001", "ground", 1024, 1024, 512, 512, true],
  ["ground_bridge_001", "ground", 1536, 1024, 768, 512, true],
  ["env_tree_oak_001", "environment", 1024, 1024, 512, 512, true],
  ["env_tree_oak_002", "environment", 1024, 1024, 512, 512, true],
  ["env_tree_oak_003", "environment", 1024, 1024, 512, 512, true],
  ["env_tree_oak_004", "environment", 1024, 1024, 512, 512, true],
  ["env_tree_flower_001", "environment", 1024, 1024, 512, 512, true],
  ["env_tree_flower_002", "environment", 1024, 1024, 512, 512, true],
  ["env_bush_001", "environment", 512, 512, 256, 256, true],
  ["env_bush_002", "environment", 512, 512, 256, 256, true],
  ["env_bush_003", "environment", 512, 512, 256, 256, true],
  ["env_flowers_001", "environment", 512, 512, 256, 256, true],
  ["env_flowers_002", "environment", 512, 512, 256, 256, true],
  ["env_flowers_003", "environment", 512, 512, 256, 256, true],
  ["env_flowers_004", "environment", 512, 512, 256, 256, true],
  ["env_rock_001", "environment", 512, 512, 256, 256, true],
  ["env_rock_002", "environment", 512, 512, 256, 256, true],
  ["env_rock_003", "environment", 512, 512, 256, 256, true],
  ["prop_bench_001", "props", 1024, 512, 512, 256, true],
  ["prop_lamp_001", "props", 512, 1024, 256, 512, true],
  ["prop_fountain_001", "props", 1536, 1536, 768, 768, true],
  ["prop_notice_board_001", "props", 1024, 1024, 512, 512, true],
  ["prop_book_cart_001", "props", 1024, 1024, 512, 512, true],
  ["prop_book_stack_001", "props", 512, 512, 256, 256, true],
  ["prop_sign_001", "props", 512, 512, 256, 256, true],
  ["bld_library_001", "buildings", 3072, 2048, 1536, 1024, true],
  ["bld_cafe_001", "buildings", 2048, 2048, 1024, 1024, true],
  ["bld_community_hall_001", "buildings", 2048, 2048, 1024, 1024, true],
  ["portal_world_gate_001", "portals", 2048, 2048, 1024, 1024, true],
  ["bld_residential_entrance_001", "buildings", 2048, 1024, 1024, 512, true],
  ["vfx_sparkle_001", "vfx", 1024, 1024, 512, 512, true],
  ["vfx_floating_paper_001", "vfx", 1024, 1024, 512, 512, true],
  ["vfx_falling_leaves_001", "vfx", 1024, 1024, 512, 512, true],
  ["vfx_portal_glow_001", "vfx", 1024, 1024, 512, 512, true],
  ["vfx_firefly_001", "vfx", 256, 256, 128, 128, true],
].map(([id, folder, masterWidth, masterHeight, exportWidth, exportHeight, transparent]) => ({
  id,
  folder,
  masterWidth,
  masterHeight,
  exportWidth,
  exportHeight,
  transparent,
}));

function isBakedTransparencyPixel(data, offset) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const highest = Math.max(red, green, blue);
  const lowest = Math.min(red, green, blue);
  const luminance = (red + green + blue) / 3;

  // Generated previews sometimes contain a literal gray checkerboard instead of alpha.
  // Its pixels are neutral and bright; the warm ink artwork is deliberately chromatic.
  return highest - lowest <= 14 && luminance >= 105;
}

async function extractRealAlpha(inputPath) {
  const source = sharp(inputPath).ensureAlpha();
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (data[pixel * 4 + 3] < 250) {
      return { data, info, extracted: false };
    }
  }

  const background = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (pixel) => {
    if (background[pixel] || !isBakedTransparencyPixel(data, pixel * 4)) return;
    background[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue((info.height - 1) * info.width + x);
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    enqueue(y * info.width);
    enqueue(y * info.width + info.width - 1);
  }

  while (head < tail) {
    const pixel = queue[head];
    head += 1;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < info.width) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - info.width);
    if (y + 1 < info.height) enqueue(pixel + info.width);
  }

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (background[pixel]) data[pixel * 4 + 3] = 0;
  }

  // Feather only pale neutral fringe pixels immediately beside the extracted background.
  for (let y = 1; y < info.height - 1; y += 1) {
    for (let x = 1; x < info.width - 1; x += 1) {
      const pixel = y * info.width + x;
      if (background[pixel]) continue;
      const offset = pixel * 4;
      const spread = Math.max(data[offset], data[offset + 1], data[offset + 2]) -
        Math.min(data[offset], data[offset + 1], data[offset + 2]);
      if (spread > 28) continue;
      const touchesBackground =
        background[pixel - 1] ||
        background[pixel + 1] ||
        background[pixel - info.width] ||
        background[pixel + info.width];
      if (touchesBackground) data[offset + 3] = 96;
    }
  }

  return { data, info, extracted: true };
}

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
  if (asset.transparent) {
    const result = await extractRealAlpha(rawPath);
    extracted = result.extracted;
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

  await sharp(masterPath)
    .resize(asset.exportWidth, asset.exportHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(exportPath);

  const metadata = await sharp(exportPath).metadata();
  const stats = await sharp(exportPath).stats();
  const alpha = stats.channels[3];
  return {
    id: asset.id,
    status: "built",
    size: `${metadata.width}x${metadata.height}`,
    alpha: alpha ? `${alpha.min}-${alpha.max}` : "opaque",
    extracted,
  };
}

const results = [];
for (const asset of assets) results.push(await processAsset(asset));

for (const result of results.filter((entry) => entry.status === "built")) {
  console.info(`${result.id}: ${result.size}, alpha=${result.alpha}, extracted=${result.extracted}`);
}
console.info(
  `World art build complete: ${results.filter((entry) => entry.status === "built").length} built, ${results.filter((entry) => entry.status === "missing").length} awaiting raw art.`,
);
