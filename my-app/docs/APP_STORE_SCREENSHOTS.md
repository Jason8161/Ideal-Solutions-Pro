# App Store screenshots — Ideal Solutions

Marketing screenshots for **Ideal Solutions** (`com.idealsolutions.app`). Use **real UI from a physical iPhone or iOS Simulator** — do not use AI-generated fake screens; the app’s industrial metal backdrop, Bebas Neue headlines, and contractor tiles must match what users install.

---

## Required iPhone sizes (pixels, portrait)

Apple accepts one primary iPhone set; Connect can scale to other sizes, but exporting these avoids soft or cropped uploads.

| Display label | Typical devices | Portrait (W × H) | Notes |
|---------------|-----------------|------------------|--------|
| **6.9"** | iPhone 16 Pro Max, 15 Pro Max | **1320 × 2868** | Newest large phones |
| **6.7"** | iPhone 14–16 Plus / Pro Max (varies) | **1290 × 2796** | **Good default export size** |
| **6.5"** | iPhone 11 Pro Max, XS Max | **1284 × 2778** | Legacy large |
| **6.3" / 6.1"** | iPhone 14–16, 13, 12, 11 Pro | **1179 × 2556** or **1284 × 2778** | Check Connect slot label |
| **5.5"** (optional) | iPhone 8 Plus | **1242 × 2208** | Only if Connect still asks |
| **iPad 12.9" / 13"** (optional) | iPad Pro | **2048 × 2732** or **2064 × 2752** | App has `supportsTablet: true` |

**Landscape:** swap width and height (e.g. 2796 × 1290). Ideal Solutions is portrait-first — use portrait for App Store unless you have a strong landscape story.

**Status bar:** Apple expects screenshots to look like the device (time, battery, signal are fine). Use **9:41** and full battery in Simulator if you want the classic Apple look; on a real phone, a normal midday screenshot is fine.

---

## Recommended screens (6) — routes & how to open

Prepare **demo data** first (one customer, one active job, one estimate line item, payment apps enabled) so lists are not empty. For gated screens, use a tier that unlocks the feature (Settings → Subscribe, or dev tier override if you use internal builds).

| # | Screen | Route | How to capture |
|---|--------|-------|----------------|
| 1 | **Home grid** | `/` | Cold start or navigate Home (footer). Show all six tiles: AI, Job Folder, Accounting, Getting Paid, Calendar, Social. |
| 2 | **Job Folder hub** | `/job-folder/boss-man` | Home → **Job Folder**. Pro+ shows Boss Man hub; lower tiers redirect to `/job-folder/current-jobs` — use whichever your marketing tier represents. |
| 3 | **Materials search** | `/materials-search` | Job Folder hub → **Materials search** (or `/job-folder` menu item with wrench/search tile). Run a search so results or supplier links are visible. |
| 4 | **Plans / Subscribe** | `/settings/subscribe` | Settings → subscription / plan picker (`PlanTierCard` layout). Do not use paywall-only `/subscribe` unless that is the screen you ship. |
| 5 | **Getting Paid** | `/getting-paid` | Home → **Getting Paid**. Enable at least Cash App / Venmo / Square in Settings → Payment apps so tiles show. |
| 6 | **Estimates** | `/estimates` or `/job-folder/estimates` | Open Estimates hub with at least one saved estimate, or `/estimates/new` with a realistic in-progress form. Pro tier unlocks saved estimates. |

**Optional 7th:** `/ai-assistance` — strong differentiator; swap for Calendar or Social if you only upload six.

**Avoid for store screenshots:** empty states, error alerts, `SubscriptionDevControls`, debug banners, and “Upgrade required” dialogs unless you are intentionally showing the paywall.

---

## Marketing captions (white text, contractor-focused)

Add captions in **Figma, Canva, or Photopea** (not in the app). Style: **bottom 28–35% dark gradient overlay** (`rgba(0,0,0,0.55)` → transparent), **white headline** (bold condensed, similar to Bebas Neue), optional subline at 85% white.

| # | Headline | Subline (optional) |
|---|----------|-------------------|
| 1 | **Your jobsite command center** | AI, jobs, pay, and calendar — one home screen |
| 2 | **Job Folder built for contractors** | Customers, jobs, photos, and reports in one place |
| 3 | **Find materials fast** | Search suppliers and build lists on the job |
| 4 | **Plans that grow with your business** | Free trial to Boss Man — upgrade when you are ready |
| 5 | **Get paid your way** | Cash App, Venmo, Square — tap and go |
| 6 | **Professional estimates** | Create, send, and track estimates from the field |

Brand line (small, top or bottom): **Ideal Solutions** — *Built for contractors — from DIY to pro crews* (matches `HomeBrandHeader`).

Splash / brand color reference: `#0B1F3A` (see `app.json` splash).

---

## Capture workflow (choose one path)

### A. Physical iPhone + TestFlight (best for Windows solo dev)

1. **Build & install**
   - From project root: `npm run eas:build:preview:ios` (or production profile when ready).
   - Upload to TestFlight in App Store Connect; install on your iPhone.
2. **Prepare the app** — sign in, complete profile, set tier for screenshots, seed demo job/estimate, enable payment apps.
3. **Capture** — Side + Volume Up (screenshot). Repeat for all six screens.
4. **Transfer to PC** — iCloud Photos, OneDrive camera upload, or USB → import folder.
5. **Size on Windows** — see [Post-processing on Windows](#post-processing-on-windows) below.

### B. iOS Simulator (Mac only)

1. Xcode → open Simulator matching **iPhone 15 Pro Max** (6.7") or **iPhone 16 Pro Max** (6.9").
2. Run app: `npx expo run:ios` or install build via `expo start` + dev client.
3. **File → Save Screen** or `Cmd + S` — PNG is **device pixel size** (e.g. 1290 × 2796).
4. AirDrop / cloud sync to Windows PC for caption compositing.

### C. Windows without Mac (your default)

| Step | Tool |
|------|------|
| Run app on phone | TestFlight or `eas:build:preview:ios` |
| Screenshots | iPhone hardware buttons |
| Transfer | OneDrive / iCloud for Windows |
| Crop to 9:19.5 aspect | Photopea (free browser) or Paint 11 |
| Resize export | Photopea: Image → Canvas Size → **1290 × 2796** |
| Captions + gradient | Canva (1290×2796 custom), Figma, or Photopea layers |
| Safe-zone reference | Open `docs/screenshot-capture-guide.html` in Chrome/Edge |

**Do not** use `expo start --web` or `expo export` screenshots for **iOS App Store** — layout and fonts differ from native iOS.

**Android APK** (`eas:build:preview:android`) is useful for Play Store later, not for Apple’s iPhone screenshot slots.

---

## Post-processing on Windows

1. **Pick master size:** export everything at **1290 × 2796** (6.7"); upscale/downscale other slots only if Connect rejects scaling.
2. **Crop:** If the PNG includes rounded device chrome from a frame tool, crop to full-bleed UI only (Apple wants app UI edge-to-edge, no fake phone bezel unless you add it consistently in all shots).
3. **Caption safe area:** Keep headlines inside the bottom **35%**; avoid covering the home footer bar and primary CTAs. Use `docs/screenshot-capture-guide.html` overlay as a guide.
4. **File names:** `01-home-1290x2796.png` … `06-estimates-1290x2796.png`.
5. **Upload:** App Store Connect → your app → **App Store** tab → **Screenshots** → drag ordered set for 6.7" / 6.9".

### Quick resize (optional PowerShell + ImageMagick)

If you install [ImageMagick](https://imagemagick.org/) on Windows:

```powershell
magick input.png -resize 1290x2796^ -gravity center -extent 1290x2796 output.png
```

---

## Checklist before first capture session

- [ ] TestFlight (or dev) build installed on iPhone
- [ ] Profile complete — home grid visible (not onboarding-only)
- [ ] Subscription tier set for Job Folder + Estimates screens you want to show
- [ ] Demo customer + job + estimate + materials search query with results
- [ ] Payment apps enabled on Getting Paid screen
- [ ] Dark mode **or** light mode — pick one and use for **all** screenshots
- [ ] Do Not Disturb / Focus off (optional clean status bar)
- [ ] Six PNGs exported at 1290 × 2796 with captions composited

---

## Optional tooling in this repo

- **`docs/screenshot-capture-guide.html`** — browser overlay for caption band and safe zones (open locally; not shipped in the app).
- No automated screenshot pipeline — intentional for solo dev accuracy.

---

## First screenshot set **today** (≈45–60 min)

1. **10 min** — Confirm TestFlight build on phone; open app, set tier, add demo job + estimate + one materials search.
2. **15 min** — Capture six screens (table above); screenshots album on iPhone.
3. **10 min** — Copy to PC (`Pictures` or `Ideal Solutions/screenshots-raw`).
4. **20 min** — Photopea: new doc **1290 × 2796**, paste each shot, add bottom gradient + white headline from caption table; export PNG.
5. **5 min** — Upload to App Store Connect (or save in `assets/marketing/screenshots/` for later submit).

You do **not** need a Mac for step 1–5 if TestFlight is already on your phone. If you have no iOS build yet, run `npm run eas:build:preview:ios` first and continue when TestFlight email arrives.

---

## Related commands

```bash
npm run eas:build:preview:ios    # internal iOS build → TestFlight
npm run eas:build:production:ios # App Store release build
npm run start:phone              # LAN dev (Android / dev client; not for store PNGs)
```

---

## Legal / accuracy

Screens must reflect **current** features and pricing shown in the app. Update screenshots when plan names, prices, or major UI change (`subscriptionPlans.ts`, home tiles).
