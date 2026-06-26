/**
 * Remove baked black letterbox/padding from home tile PNGs via corner-connected flood fill.
 * Preserves dark artwork (metal textures) that is not connected to image borders.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const IMAGE_FILES = [
  "ideal-solutions-pro-button.png",
  "home-todo.png",
  "home-job-folder.png",
  "home-calendar.png",
  "home-getting-paid.png",
  "home-misc-apps.png",
  "home-social-media.png",
];

const IMAGES_DIR = path.join(projectRoot, "assets", "images");
const BACKUP_DIR = path.join(IMAGES_DIR, "_backup-home-tiles");
const HOME_BUTTONS_DIR = path.join(projectRoot, "assets", "home-buttons");

/** Per-image overrides; auto threshold used when omitted. */
const OVERRIDES = {
  "ideal-solutions-pro-button.png": { threshold: 28, featherMax: 55 },
  "home-todo.png": { threshold: 25, featherMax: 50 },
  "home-job-folder.png": { threshold: 28, featherMax: 55 },
  "home-calendar.png": { threshold: 25, featherMax: 50 },
  "home-getting-paid.png": { threshold: 30, featherMax: 55 },
  "home-misc-apps.png": { threshold: 25, featherMax: 50 },
  "home-social-media.png": { threshold: 28, featherMax: 55 },
};

function isNearBlack(r, g, b, threshold) {
  return r <= threshold && g <= threshold && b <= threshold;
}

function autoThreshold(corners, fallback = 30) {
  const maxCorner = Math.max(...corners.flatMap(([r, g, b]) => [r, g, b]));
  return Math.min(40, Math.max(20, maxCorner + 12));
}

function sampleCorners(data, w, h, channels) {
  const pts = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  return pts.map(([x, y]) => {
    const i = (y * w + x) * channels;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  });
}

function transparencyStats(data, channels) {
  const total = data.length / channels;
  let transparent = 0;
  let semi = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += channels) {
    const a = data[i + 3];
    if (a < 10) transparent++;
    else if (a < 245) semi++;
    else opaque++;
  }
  return {
    totalPixels: total,
    transparent: transparent,
    semiTransparent: semi,
    opaque: opaque,
    transparentPct: +((transparent / total) * 100).toFixed(2),
    semiTransparentPct: +((semi / total) * 100).toFixed(2),
    opaquePct: +((opaque / total) * 100).toFixed(2),
  };
}

/**
 * Flood fill from all border pixels that match near-black threshold.
 * Returns Uint8Array alpha mask (0 = transparent background).
 */
function floodFillBackgroundMask(data, w, h, channels, threshold) {
  const total = w * h;
  const visited = new Uint8Array(total);
  const isBg = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const idx = (x, y) => y * w + x;
  const pixel = (p) => {
    const o = p * channels;
    return [data[o], data[o + 1], data[o + 2]];
  };

  const trySeed = (x, y) => {
    const p = idx(x, y);
    if (visited[p]) return;
    const [r, g, b] = pixel(p);
    if (!isNearBlack(r, g, b, threshold)) return;
    visited[p] = 1;
    isBg[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p / w) | 0;
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = idx(nx, ny);
      if (visited[np]) continue;
      const [r, g, b] = pixel(np);
      if (!isNearBlack(r, g, b, threshold)) continue;
      visited[np] = 1;
      isBg[np] = 1;
      queue[tail++] = np;
    }
  }

  return isBg;
}

/** Feather anti-aliased edge pixels adjacent to removed background. */
function applyFeatherAlpha(out, w, h, channels, isBg, featherMax) {
  const total = w * h;
  const alpha = new Uint8Array(total);
  for (let p = 0; p < total; p++) {
    alpha[p] = isBg[p] ? 0 : 255;
  }

  for (let p = 0; p < total; p++) {
    if (isBg[p]) continue;
    const x = p % w;
    const y = (p / w) | 0;
    let touchesBg = false;
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (isBg[idx(nx, ny, w)]) {
        touchesBg = true;
        break;
      }
    }
    if (!touchesBg) continue;

    const o = p * channels;
    const r = out[o];
    const g = out[o + 1];
    const b = out[o + 2];
    const maxC = Math.max(r, g, b);
    if (maxC > featherMax) continue;
    const t = maxC / featherMax;
    alpha[p] = Math.round(255 * t);
  }

  for (let p = 0; p < total; p++) {
    const o = p * channels;
    out[o + 3] = alpha[p];
  }
}

function idx(x, y, w) {
  return y * w + x;
}

async function analyzeFile(absPath) {
  const { data, info } = await sharp(absPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const stats = transparencyStats(data, info.channels);
  return {
    width: info.width,
    height: info.height,
    channels: info.channels,
    stats,
  };
}

async function processImage(filename) {
  const srcPath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(srcPath)) {
    return { filename, skipped: true, reason: "missing" };
  }

  const before = await analyzeFile(srcPath);
  const corners = sampleCorners(
    (
      await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    ).data,
    before.width,
    before.height,
    4,
  );

  const override = OVERRIDES[filename] ?? {};
  const threshold = override.threshold ?? autoThreshold(corners);
  const featherMax = override.featherMax ?? 55;

  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  const isBg = floodFillBackgroundMask(
    out,
    info.width,
    info.height,
    info.channels,
    threshold,
  );
  applyFeatherAlpha(out, info.width, info.height, info.channels, isBg, featherMax);

  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(srcPath, backupPath);
  }

  const pngBuffer = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();

  const stagingPath = path.join(BACKUP_DIR, `.staging-${filename}`);
  fs.writeFileSync(stagingPath, pngBuffer);
  try {
    fs.unlinkSync(srcPath);
  } catch {
    // OneDrive may keep the file handle; overwrite below if delete fails.
  }
  fs.renameSync(stagingPath, srcPath);

  const after = await analyzeFile(srcPath);
  const bgRemoved = isBg.reduce((n, v) => n + v, 0);

  return {
    filename,
    srcPath,
    threshold,
    featherMax,
    dimensions: { width: info.width, height: info.height },
    dimensionsUnchanged:
      before.width === after.width && before.height === after.height,
    floodFillPixels: bgRemoved,
    floodFillPct: +((bgRemoved / (info.width * info.height)) * 100).toFixed(2),
    before: before.stats,
    after: after.stats,
  };
}

function syncHomeButtons(filename) {
  const src = path.join(IMAGES_DIR, filename);
  const dest = path.join(HOME_BUTTONS_DIR, filename);
  if (!fs.existsSync(src)) return null;
  if (!fs.existsSync(HOME_BUTTONS_DIR)) {
    fs.mkdirSync(HOME_BUTTONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(dest)) return { filename, synced: false, reason: "no home-buttons copy" };
  fs.copyFileSync(src, dest);
  return { filename, synced: true, dest };
}

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const results = [];
  for (const filename of IMAGE_FILES) {
    const result = await processImage(filename);
    results.push(result);
    if (!result.skipped) {
      const sync = syncHomeButtons(filename);
      result.homeButtonsSync = sync;
    }
  }

  console.log(JSON.stringify({ backupDir: BACKUP_DIR, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
