# Home tile preset icons (24)

These files are **`preset-01.png` … `preset-24.png`** (row by row, left to right on the original **6×4** sprite sheet).

Right now each file may be a **placeholder** copy of the default Materials tile so the app builds. Replace them with your real artwork (same filenames and PNG format), then restart Expo with cache clear:

`npx.cmd expo start -c`

## Optional: slice a sprite sheet

1. Save your master sheet as **`sprite-sheet.png`** in this folder.
2. From `my-app`, run: `npm run slice:home-tile-presets` (requires `sharp` — the script will tell you to `npm i -D sharp` once).

The script cuts a **6 columns × 4 rows** grid into the 24 `preset-NN.png` files.
