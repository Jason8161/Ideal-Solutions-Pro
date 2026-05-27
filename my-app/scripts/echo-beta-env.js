// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require("../app.config.js")();
console.log(
  "[start] EXPO_PUBLIC_BETA_FULL_ACCESS =",
  process.env.EXPO_PUBLIC_BETA_FULL_ACCESS ?? "(unset)",
);
console.log("[start] app.config extra.betaFullAccess =", config.extra.betaFullAccess);
