/**
 * Writes preset-01.png … preset-24.png with distinct colors + index labels so the
 * picker thumbnails are not identical (placeholder art until you replace them).
 *
 * From my-app: `npm run generate:home-tile-presets`
 * Requires: `sharp` (devDependency).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dir = path.join(root, "assets", "settings", "images", "home-tile-presets");

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Install sharp first: npm i -D sharp");
  process.exit(1);
}

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

for (let i = 1; i <= 24; i += 1) {
  const hue = Math.round(((i - 1) / 24) * 360);
  const name = `preset-${String(i).padStart(2, "0")}.png`;
  const dest = path.join(dir, name);
  const num = String(i).padStart(2, "0");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue},58%,42%);stop-opacity:1" />
      <stop offset="100%" style="stop-color:hsl(${(hue + 40) % 360},45%,28%);stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)" rx="48" />
  <text x="256" y="300" font-size="180" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="system-ui,Segoe UI,sans-serif" font-weight="800">${num}</text>
</svg>`;

  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(dest);
  console.log("Wrote", name);
}

console.log("Done. Restart Expo with cache clear: npx.cmd expo start -c");
