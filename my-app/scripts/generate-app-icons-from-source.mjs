/**
 * One-shot: resize chat/source app icon into Expo asset paths.
 * Usage: node scripts/generate-app-icons-from-source.mjs <source.png>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "assets", "images");
const BG = "#141210";
const ICON_SIZE = 1024;
const FAVICON_SIZE = 48;

const srcArg = process.argv[2];
if (!srcArg || !fs.existsSync(srcArg)) {
  console.error("Usage: node scripts/generate-app-icons-from-source.mjs <source.png>");
  process.exit(1);
}

const sharp = (await import("sharp")).default;
const meta = await sharp(srcArg).metadata();
console.log(`Source: ${srcArg}`);
console.log(`  ${meta.width}×${meta.height}, ${meta.format}, channels=${meta.channels}`);

async function writeIcon(outName, size) {
  const outPath = path.join(outDir, outName);
  await sharp(srcArg)
    .resize(size, size, { fit: "contain", background: BG })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  const stat = fs.statSync(outPath);
  console.log(`Wrote ${outPath} (${stat.size} bytes, ${size}×${size})`);
}

await writeIcon("icon.png", ICON_SIZE);
await writeIcon("android-icon-foreground.png", ICON_SIZE);
await writeIcon("favicon.png", FAVICON_SIZE);

console.log("Skipped splash-icon.png (unchanged).");
