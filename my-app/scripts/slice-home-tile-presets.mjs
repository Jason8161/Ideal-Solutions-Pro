/**
 * Slices `assets/settings/images/home-tile-presets/sprite-sheet.png` (6×4) into preset-01 … preset-24 PNGs.
 * Run from my-app: `node scripts/slice-home-tile-presets.mjs`
 * Requires: npm i -D sharp
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dir = path.join(root, "assets", "settings", "images", "home-tile-presets");
const srcPath = path.join(dir, "sprite-sheet.png");

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Install sharp first: npm i -D sharp");
  process.exit(1);
}

if (!fs.existsSync(srcPath)) {
  console.error(`Missing source image:\n  ${srcPath}\n\nSave your 6×4 sprite sheet as sprite-sheet.png in that folder.`);
  process.exit(1);
}

const COLS = 6;
const ROWS = 4;
const meta = await sharp(srcPath).metadata();
const w = meta.width ?? 0;
const h = meta.height ?? 0;
if (w < COLS || h < ROWS) {
  console.error(`Image too small (${w}×${h}). Expected a 6×4 grid sprite.`);
  process.exit(1);
}

const cellW = Math.floor(w / COLS);
const cellH = Math.floor(h / ROWS);
let idx = 0;
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    idx += 1;
    const name = `preset-${String(idx).padStart(2, "0")}.png`;
    const dest = path.join(dir, name);
    const left = col * cellW;
    const top = row * cellH;
    await sharp(srcPath).extract({ left, top, width: cellW, height: cellH }).png().toFile(dest);
    console.log("Wrote", name);
  }
}
console.log("Done. Restart Expo: npx.cmd expo start -c");
