/**
 * Legacy entry point: home-screen button images are now discovered with Metro `require.context`
 * in lib/homeScreenButtonsFolderImages.ts (no generated catalog).
 *
 * Usage: node ./scripts/generate-home-screen-buttons-catalog.mjs
 */
console.log(
  "No catalog step needed. Images under assets/settings/images/home-screen-buttons/ are bundled automatically.\n" +
    "After npm run sync:home-screen-buttons, restart Metro with: npx expo start -c",
);
