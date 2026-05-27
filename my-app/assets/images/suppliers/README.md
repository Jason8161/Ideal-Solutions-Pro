# Supplier logos

PNG files named by supplier id (e.g. `homedepot.png`, `graybar.png`). Used in Supplier Hub and Settings → Supported Integrations.

To refresh favicons from retailer sites:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/fetch-supplier-logos.ps1
```

Then restart Expo with cache clear: `npx expo start -c`
