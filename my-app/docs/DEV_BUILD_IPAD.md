# iPad development build (Windows + physical device)

Use an **Expo development build** (custom dev client) to test **Ideal Solutions Pro** on a **physical iPad** from a **Windows** laptop. This is required for native modules such as **RevenueCat** — **Expo Go is not supported**.

This workflow uses **internal EAS builds only**. It does **not** create App Store or production store builds.

---

## Build profiles (which one to use)

| Profile | Platform | Use for |
|--------|----------|---------|
| **`development-device`** | iOS physical iPad/iPhone | **iPad testing (this guide)** — dev client, internal distribution, installs on registered devices |
| `development` | iOS Simulator (Mac) | Dev client for simulator only (`ios.simulator: true`) |
| `development` | Android | Dev client APK for physical Android |
| `preview` | iOS / Android | Internal QA build (not a dev client; JS is bundled) |
| `production` | iOS / Android | **App Store / Play Store only** — do not use for day-to-day iPad dev |

**For your iPad:** always use **`development-device`**.

npm script (recommended):

```powershell
npm run eas:build:development:ios
```

That script runs `eas build --profile development-device --platform ios`.

---

## Prerequisites

- EAS CLI logged in: `npx eas login`
- Apple Developer account linked to the EAS project
- Project folder: `C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app`
- `.env` with RevenueCat keys (see `env.example` / `docs/REVENUECAT_SETUP.md`) — rebuild dev client after changing native-related env vars
- `expo-dev-client` is installed and configured in `app.config.js` (already set up in this repo)

---

## First-time setup (one-time per iPad)

Run these from the project folder in **PowerShell**:

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
```

### 1. Register your iPad UDID (do this first)

```powershell
npx eas device:create
```

Follow the prompts (QR code or link on the iPad). **Why:** the `development-device` profile uses **internal distribution**. Apple only allows installing ad-hoc/internal IPAs on devices whose UDIDs are registered on your Apple Developer account. EAS manages provisioning for you once the device is registered.

To list registered devices:

```powershell
npx eas device:list
```

### 2. Build the iOS dev client for physical devices

```powershell
npm run eas:build:development:ios
```

Equivalent direct command:

```powershell
cross-env EAS_NO_VCS=1 eas build --profile development-device --platform ios
```

`EAS_NO_VCS=1` matches other npm EAS scripts — useful when git metadata is missing or the repo lives under OneDrive.

Wait for the build on [expo.dev](https://expo.dev). **Do not** use the `production` profile for this step.

### 3. Install the dev build on the iPad

When the build finishes:

1. Open the build page on [expo.dev](https://expo.dev) (link in the terminal or email).
2. On the iPad, open the install link (Safari) or scan the QR code.
3. If iOS blocks the install, trust the developer certificate: **Settings → General → VPN & Device Management**.
4. If you previously installed an older dev build with a conflicting signature, **delete the old app** from the iPad before installing the new one.

You only need a **new native build** when you change native code, native dependencies, or config that affects the native project (plugins, `app.json` / `app.config.js` native settings, RevenueCat keys baked at build time, etc.).

---

## Daily development (JS changes — no new EAS build)

After the dev client is installed on the iPad:

### 4. Start Metro on Windows (same Wi‑Fi as iPad)

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npm run start:dev-client
```

This runs `npx expo start --dev-client`. Keep the terminal open.

**Network:** the Windows PC and iPad must be on the **same Wi‑Fi** network so the iPad can reach Metro (default port **8081**).

### 5. Connect the iPad dev app to Metro

1. Open **Ideal Solutions Pro** (development build) on the iPad — not Expo Go.
2. The dev launcher should list your Metro server, or tap **Enter URL manually** and use the LAN URL shown in the terminal (e.g. `exp://192.168.x.x:8081`).
3. Load the app. JavaScript and most React changes **hot reload** without rebuilding the IPA.

Shake the device (or use the dev menu) to reload, open the debugger, etc.

---

## Build types compared

| | Dev build (`development-device`) | Preview | Production |
|---|----------------------------------|---------|------------|
| **Expo Go** | No | No | No |
| **Dev client / Metro** | Yes — JS from your PC | No — JS bundled in app | No — JS bundled in app |
| **RevenueCat / native modules** | Yes | Yes | Yes |
| **Distribution** | Internal (registered devices) | Internal | App Store / Play |
| **Typical use** | iPad daily dev on Windows | QA / stakeholder builds | Store release |
| **Command** | `npm run eas:build:development:ios` | `npm run eas:build:preview:ios` | `npm run eas:build:production:ios` |

---

## Troubleshooting

### iPad cannot connect to Metro

- Confirm **same Wi‑Fi** (avoid guest networks that block device-to-device traffic).
- **Windows Firewall:** allow **Node.js** / port **8081** on private networks.
- Try clearing Metro cache: `npx expo start --dev-client -c`
- If LAN still fails, use a tunnel (slower but works across networks):

  ```powershell
  npx expo start --dev-client --tunnel
  ```

### “Unable to install” or app won’t open after a new build

- **Delete the old dev build** from the iPad, then install again from the expo.dev build page.
- Confirm the iPad UDID is registered: `npx eas device:list`

### RevenueCat / purchases not working

- Use the **development build**, not Expo Go.
- Ensure `.env` has `EXPO_PUBLIC_RC_APPLE_KEY` (and related keys). **Rebuild** the dev client after changing keys — Metro alone is not enough for native config.
- See `docs/REVENUECAT_SETUP.md`.

### Wrong build type installed

- Dev client icon/name matches **Ideal Solutions Pro** but includes the Expo dev menu.
- If the app behaves like a standalone release with no Metro connection, you may have installed a **preview** or **production** build instead — install a build from profile **`development-device`**.

### EAS / git errors on OneDrive

- npm scripts set `EAS_NO_VCS=1`. If running `eas` directly, prefix:

  ```powershell
  $env:EAS_NO_VCS=1; eas build --profile development-device --platform ios
  ```

---

## Quick reference

| Step | Command |
|------|---------|
| Register iPad | `npx eas device:create` |
| Build dev client (iPad) | `npm run eas:build:development:ios` |
| Start Metro (Windows) | `npm run start:dev-client` |
| Metro via tunnel | `npx expo start --dev-client --tunnel` |

Related: [EAS_SETUP.md](../EAS_SETUP.md), [REVENUECAT_SETUP.md](./REVENUECAT_SETUP.md)
