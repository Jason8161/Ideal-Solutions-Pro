/**
 * Run from repo root. Delegates to my-app/scripts/generate-payment-app-brand-glyphs.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const myAppDir = path.join(__dirname, "..", "my-app");
const script = path.join(myAppDir, "scripts", "generate-payment-app-brand-glyphs.mjs");

const result = spawnSync(process.execPath, [script], {
  cwd: myAppDir,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
