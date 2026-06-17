/**
 * EAS Build hook (runs on the macOS/Linux worker after npm ci).
 * Strips read-only OneDrive .expo folders that may slip into the archive and break prebuild icon caching.
 */
const fs = require("fs");
const path = require("path");

const dirs = [
  ".expo",
  ".expo-export-test",
  ".expo-export-test-build34",
  ".expo-export-ipad-test",
  ".expo-export-ios-review",
  "dist",
  "dist-test-export",
];

for (const dir of dirs) {
  const target = path.join(__dirname, "..", dir);
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[eas-build-post-install] removed ${dir}`);
  } catch (err) {
    console.warn(`[eas-build-post-install] could not remove ${dir}:`, err.message);
  }
}
