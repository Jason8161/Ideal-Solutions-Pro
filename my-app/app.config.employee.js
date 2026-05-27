/**
 * Employee store listing config stub.
 * EAS sets APP_VARIANT=employee; local: APP_VARIANT=employee npx expo start
 *
 * Delegates to app.config.js (shared plugins, env, RevenueCat keys).
 */
process.env.APP_VARIANT = "employee";
process.env.EXPO_PUBLIC_APP_VARIANT = "employee";

// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = require("./app.config.js");
