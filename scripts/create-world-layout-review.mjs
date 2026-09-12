import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { WORLD_ART_ASSETS } from "./world-art-spec.mjs";

const root = process.cwd();
const publicRoot = path.join(root, "public", "world");
const outputPath = path.join(root, "art", "world", "review", "central-world-layout.png");
const map = JSON.parse(await fs.readFile(path.join(root, "world", "maps", "central-plaza.json"), "utf8"));
const scale = 0.5;
const canvasWidth = Math.round(map.width * scale);
const canvasHeight = Math.round(map.height * scale);
const assetFolders = new Map(WORLD_ART_ASSETS.map((asset) => [asset.id, asset.folder]));

async function resizeAsset(assetPath, width, height, angle = 0) {
  const resized = sharp(assetPath).resize(Math.round(width * scale), Math.round(height * scale), {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  });
  if (angle) resized.rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  return resized.png().toBuffer({ resolveWithObject: true });
}

function centerComposite(input, x, y) {
  return {
    input: input.data,
    left: Math.round(x * scale - input.info.width / 2),
    top: Math.round(y * scale - input.info.height / 2),
  };
}

const grass = await sharp(path.join(publicRoot, "ground", "ground_grass_001.webp"))
  .resize(256, 256, { fit: "fill" })
  .png()
  .toBuffer({ resolveWithObject: true });
const composites = [];
for (let y = 0; y < canvasHeight; y += grass.info.height) {
  for (let x = 0; x < canvasWidth; x += grass.info.width) composites.push({ input: grass.data, left: x, top: y });
}

const straightPath = path.join(publicRoot, "ground", "ground_path_straight_001.webp");
for (const segment of [
  { x: map.width / 2, y: 455, width: 400, height: 520, angle: 0 },
  { x: map.width / 2, y: 1485, width: 400, height: 610, angle: 0 },
  { x: 600, y: 945, width: 400, height: 590, angle: -90 },
  { x: 1800, y: 945, width: 400, height: 590, angle: 90 },
]) {
  const image = await resizeAsset(straightPath, segment.width, segment.height, segment.angle);
  composites.push(centerComposite(image, segment.x, segment.y));
}

const plazaWidth = 720;
const plazaHeight = 650;
const plazaRadius = 118;
const plazaMask = Buffer.from(`<svg width="${plazaWidth * scale}" height="${plazaHeight * scale}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${plazaRadius * scale}" fill="white"/></svg>`);
const plaza = await sharp(path.join(publicRoot, "ground", "ground_plaza_stone_001.webp"))
  .resize(Math.round(plazaWidth * scale), Math.round(plazaHeight * scale), { fit: "fill" })
  .composite([{ input: plazaMask, blend: "dest-in" }])
  .png()
  .toBuffer({ resolveWithObject: true });
composites.push(centerComposite(plaza, map.width / 2, 945));

const layers = map.objects.map((object) => ({ kind: "object", depth: object.y + object.depthOffset, object }));
layers.push(
  { kind: "character", depth: 720, x: 1070, y: 720, asset: "character_librarian_idle_001" },
  { kind: "character", depth: map.spawn.y, x: map.spawn.x, y: map.spawn.y, asset: "character_default_idle_001" },
);
layers.sort((left, right) => left.depth - right.depth);

for (const layer of layers) {
  if (layer.kind === "character") {
    const frame = await sharp(path.join(publicRoot, "characters", "composite", `${layer.asset}.webp`))
      .extract({ left: 0, top: 0, width: 128, height: 192 })
      .resize(Math.round(84 * scale), Math.round(126 * scale), { fit: "fill" })
      .png()
      .toBuffer({ resolveWithObject: true });
    composites.push({
      input: frame.data,
      left: Math.round(layer.x * scale - frame.info.width / 2),
      top: Math.round(layer.y * scale - frame.info.height * 0.92),
    });
    continue;
  }

  const object = layer.object;
  const folder = assetFolders.get(object.asset);
  if (!folder) continue;
  const image = await resizeAsset(
    path.join(publicRoot, folder, `${object.asset}.webp`),
    object.width,
    object.height,
  );
  composites.push({
    input: image.data,
    left: Math.round((object.x - object.width / 2) * scale),
    top: Math.round((object.y - object.height) * scale),
  });
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await sharp({
  create: {
    width: canvasWidth,
    height: canvasHeight,
    channels: 4,
    background: { r: 232, g: 226, b: 197, alpha: 1 },
  },
})
  .composite(composites)
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(outputPath);

console.info(`Central world layout review: ${outputPath}`);
