import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let si;
try {
  si = require("simple-icons");
} catch {
  console.error(
    "Missing simple-icons. From my-app run:\n  npm install simple-icons --save-dev\nThen run this script again.",
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "lib", "paymentAppBrandGlyphs.ts");

const presets = {
  venmo: "siVenmo",
  square: "siSquare",
  cashapp: "siCashapp",
  paypal: "siPaypal",
  zelle: "siZelle",
  stripe: "siStripe",
  "apple-pay": "siApplepay",
};

const lines = [
  'import type { PaymentAppPresetId } from "@/lib/paymentAppsPreferences";',
  "",
  "export type PaymentAppBrandGlyph = { hex: string; path: string; title: string };",
  "",
  "export const PAYMENT_APP_BRAND_GLYPHS: Record<Exclude<PaymentAppPresetId, \"custom\">, PaymentAppBrandGlyph> = {",
];

for (const [preset, key] of Object.entries(presets)) {
  const icon = si[key];
  if (!icon) throw new Error(`Missing simple-icons export: ${key}`);
  lines.push(
    `  ${JSON.stringify(preset)}: { hex: ${JSON.stringify(`#${icon.hex}`)}, title: ${JSON.stringify(icon.title)}, path: ${JSON.stringify(icon.path)} },`,
  );
}

lines.push("};", "");

fs.writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${outPath}`);
