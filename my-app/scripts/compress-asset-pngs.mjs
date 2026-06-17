/**
 * One-off PNG compressor for assets/images — resize to max 1024px and optimize.
 * Skips app icon / splash assets required at 1024×1024.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const ROOT = path.resolve("assets/images");
const MAX_DIM = 1024;

const SKIP = new Set([
  "icon.png",
  "splash-icon.png",
  "android-icon-foreground.png",
  "android-icon-monochrome.png",
  "android-icon-background.png",
  "favicon.png",
  "icon-source.png",
  "app-background.original.png",
]);

/** UI home tiles — palette quantization is usually fine on phone. */
function usePalette(basename) {
  return (
    basename.startsWith("home-") ||
    basename === "ideal-solutions-pro-button.png" ||
    basename === "hot wire.png"
  );
}

function walkPngs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkPngs(full));
    else if (entry.name.toLowerCase().endsWith(".png")) out.push(full);
  }
  return out;
}

async function compressOne(filePath) {
  const basename = path.basename(filePath);
  if (SKIP.has(basename)) {
    return { file: filePath, skipped: true, reason: "app icon/splash/source" };
  }

  const before = fs.statSync(filePath).size;
  if (before < 80 * 1024) {
    return { file: filePath, skipped: true, reason: "already small", before };
  }

  const meta = await sharp(filePath).metadata();
  const needsResize =
    (meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM;

  let base = sharp(filePath);
  if (needsResize) {
    base = base.resize({
      width: MAX_DIM,
      height: MAX_DIM,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const palette = usePalette(basename);
  const variants = [];

  variants.push({
    label: "truecolor",
    buffer: await base
      .clone()
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer(),
  });

  if (palette) {
    variants.push({
      label: "palette",
      buffer: await base
        .clone()
        .png({
          compressionLevel: 9,
          effort: 10,
          palette: true,
          quality: 85,
          dither: 0.8,
        })
        .toBuffer(),
    });
  }

  variants.sort((a, b) => a.buffer.length - b.buffer.length);
  const best = variants[0];

  if (best.buffer.length >= before) {
    return {
      file: filePath,
      skipped: true,
      reason: "no savings",
      before,
      after: before,
      variant: best.label,
    };
  }

  const tmp = path.join(
    os.tmpdir(),
    `ideal-png-${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
  );
  await fs.promises.writeFile(tmp, best.buffer);
  await fs.promises.rename(tmp, filePath);

  const after = fs.statSync(filePath).size;
  const outMeta = await sharp(filePath).metadata();

  return {
    file: filePath,
    skipped: false,
    before,
    after,
    variant: best.label,
    width: outMeta.width,
    height: outMeta.height,
    resized: needsResize,
  };
}

const files = walkPngs(ROOT).sort(
  (a, b) => fs.statSync(b).size - fs.statSync(a).size,
);

const results = [];
for (const file of files) {
  results.push(await compressOne(file));
}

const beforeTotal = files.reduce((s, f) => s + fs.statSync(f).size, 0);
const afterTotal = files.reduce((s, f) => s + fs.statSync(f).size, 0);

console.log(JSON.stringify({ results, beforeTotal, afterTotal }, null, 2));
