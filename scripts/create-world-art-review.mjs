import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const worldRoot = path.join(root, "public", "world");
const reviewRoot = path.join(root, "art", "world", "review");
const outputPath = path.join(reviewRoot, "world-assets-contact-sheet.png");
const treeOutputPath = path.join(reviewRoot, "tree-transparency-review.png");
const folders = ["ground", "environment", "props", "buildings", "portals", "vfx", "characters/composite"];
const files = [];

for (const folder of folders) {
  const folderPath = path.join(worldRoot, folder);
  for (const filename of (await fs.readdir(folderPath)).filter((name) => name.endsWith(".webp")).sort()) {
    files.push({ folder, filename, source: path.join(folderPath, filename) });
  }
}

const columns = 4;
const tileWidth = 320;
const tileHeight = 300;
const imageWidth = 292;
const imageHeight = 248;
const rows = Math.ceil(files.length / columns);

const background = await sharp({
  create: {
    width: columns * tileWidth,
    height: rows * tileHeight,
    channels: 4,
    background: "#171a20",
  },
}).png().toBuffer();

const composites = [];
for (let index = 0; index < files.length; index += 1) {
  const asset = files[index];
  const left = (index % columns) * tileWidth;
  const top = Math.floor(index / columns) * tileHeight;
  const panel = Buffer.from(`
    <svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="130" fill="#050709"/>
      <rect x="160" width="160" height="130" fill="#fffdf8"/>
      <rect y="130" width="160" height="130" fill="#126e82"/>
      <rect x="160" y="130" width="160" height="130" fill="#b82d55"/>
      <rect y="260" width="320" height="40" fill="#11151a"/>
      <text x="160" y="284" text-anchor="middle" fill="#f6efe4" font-family="Arial, sans-serif" font-size="15">${asset.filename.replace(".webp", "")}</text>
    </svg>
  `);
  const thumbnail = await sharp(asset.source)
    .resize(imageWidth, imageHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  composites.push({ input: panel, left, top });
  composites.push({ input: thumbnail, left: left + 14, top: top + 6 });
}

await fs.mkdir(reviewRoot, { recursive: true });
await sharp(background).composite(composites).png({ compressionLevel: 9 }).toFile(outputPath);
console.info(`World art review sheet: ${outputPath}`);

const treeFiles = files.filter((asset) => asset.folder === "environment" && asset.filename.startsWith("env_tree_"));
const treeTileSize = 512;
const treeColumns = 3;
const treeRows = Math.ceil(treeFiles.length / treeColumns);
const treeBackground = await sharp({
  create: {
    width: treeColumns * treeTileSize,
    height: treeRows * treeTileSize,
    channels: 4,
    background: "#050709",
  },
}).png().toBuffer();
const treeComposites = [];
for (let index = 0; index < treeFiles.length; index += 1) {
  const asset = treeFiles[index];
  const left = (index % treeColumns) * treeTileSize;
  const top = Math.floor(index / treeColumns) * treeTileSize;
  const panel = Buffer.from(`<svg width="${treeTileSize}" height="${treeTileSize}" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="#050709"/>
    <rect x="256" width="256" height="256" fill="#fffdf8"/>
    <rect y="256" width="256" height="256" fill="#126e82"/>
    <rect x="256" y="256" width="256" height="256" fill="#b82d55"/>
    <rect y="480" width="512" height="32" fill="#11151a"/>
    <text x="256" y="502" text-anchor="middle" fill="#f6efe4" font-family="Arial, sans-serif" font-size="15">${asset.filename.replace(".webp", "")}</text>
  </svg>`);
  const tree = await sharp(asset.source)
    .resize(480, 456, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  treeComposites.push({ input: panel, left, top });
  treeComposites.push({ input: tree, left: left + 16, top: top + 12 });
}
await sharp(treeBackground).composite(treeComposites).png({ compressionLevel: 9 }).toFile(treeOutputPath);
console.info(`Tree transparency review: ${treeOutputPath}`);
