# EAS (Expo Application Services) setup — Ideal Solutions

This project is configured for [EAS Build](https://docs.expo.dev/build/introduction/) with six profiles in `eas.json` (JSON has no comments — field notes live here):

| Profile | Purpose | Output |
|--------|---------|--------|
| **development** | Dev client + Metro (native modules, RevenueCat) | Internal; iOS **simulator** build; Android **APK** |
| **preview** | QA / TestFlight internal / sideload | Internal distribution; iOS device IPA; Android APK; **beta full access** (`EXPO_PUBLIC_BETA_FULL_ACCESS=true`) |
| **production** | App Store / Google Play (**Ideal Solutions Pro**) | Store distribution; iOS device; Android **AAB**; **`autoIncrement: true`** (remote build numbers, e.g. build 24); **no** beta flag |
| **employee-ios** | Employee app — App Store (extends production) | Same as production; sets `APP_VARIANT=employee` → `com.idealsolutions.employee` |
| **employee-android** | Employee app — Google Play (extends production) | Same as production; sets `APP_VARIANT=employee` → `com.idealsolutions.employee` |

### `eas.json` field reference

| Field | Value | Notes |
|-------|-------|-------|
| `cli.version` | `>=16.17.4` | Matches `eas-cli` in `package.json` devDependencies |
| `cli.appVersionSource` | `remote` | EAS manages iOS/Android build numbers on the server (keeps build 24+ continuity) |
| `build.production.autoIncrement` | `true` | Bumps build number each production/employee store build |
| `build.production.distribution` | `store` | App Store / Play Store (not internal) |
| `build.production.android.buildType` | `app-bundle` | Required for Play Console |
| `build.preview.distribution` | `internal` | TestFlight internal / sideload / ad-hoc |
| `build.development.developmentClient` | `true` | Requires `expo-dev-client`; pair with `npx expo start --dev-client` |
| `submit.production.ios.ascAppId` | `6771799454` | App Store Connect app ID for `npm run eas:submit:ios` |

App identifiers (change only if you already registered different IDs in Apple/Google):

- **iOS** `com.idealsolutions.app` (`app.json` → `expo.ios.bundleIdentifier`)
- **Android** `com.idealsolutions.app` (`app.json` → `expo.android.package`)
- **Slug** `ideal-solutions` (Expo project URL: `expo.dev/.../ideal-solutions`)

Dynamic config lives in `app.config.js` (loads `.env` via `dotenv`). Static UI config is in `app.json`.

---

## 1. Install EAS CLI

**Option A — project devDependency (recommended, matches npm scripts):**

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npm install
npx eas --version
```

**Option B — global install:**

```powershell
npm install -g eas-cli
eas --version
```

---

## 2. Log in to Expo

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npx eas login
```

Use the Expo account that should own the app on [expo.dev](https://expo.dev).

---

## 3. Link the project (`eas init`)

Run **interactively** once (creates/links the EAS project and may write `extra.eas.projectId`):

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npx eas init
```

When prompted:

- Confirm slug **ideal-solutions** (or accept the suggested name).
- Copy the **Project ID** (UUID) into `my-app/.env`:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=<uuid-from-eas-init>
```

Restart Expo after changing `.env` (`npx expo start -c`). Push notifications need this ID in dev/production builds.

`app.config.js` already maps `EXPO_PUBLIC_EAS_PROJECT_ID` → `extra.eas.projectId`.

---

## 4. Configure credentials (first time)

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npx eas build:configure
```

EAS will offer to manage iOS/Android signing. Accept for the simplest path, or supply your own certificates/keystore.

---

## 5. Environment variables for cloud builds

Local dev uses `my-app/.env` (copy from `env.example`). **EAS cloud builds do not upload `.env`** unless you configure secrets.

### Required for production-like features

| Variable | Where to set | Notes |
|----------|----------------|-------|
| `EXPO_PUBLIC_EAS_PROJECT_ID` | EAS env or `.env` + commit via `app.config` at build | From `eas init` |
| `EXPO_PUBLIC_RC_APPLE_KEY` | EAS Secrets | RevenueCat iOS SDK key (`appl_...`) |
| `EXPO_PUBLIC_RC_GOOGLE_KEY` | EAS Secrets | RevenueCat Android SDK key (`goog_...`) |
| `EXPO_PUBLIC_PRICING_API_URL` | EAS env (production) | Public HTTPS API root, not `localhost` |
| `EXPO_PUBLIC_CUSTOMER_REQUEST_URL` | EAS env (production) | Hosted customer invite page (see `env.example`) |

Set secrets (repeat per profile if needed):

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npx eas secret:create --name EXPO_PUBLIC_RC_APPLE_KEY --value "appl_..." --type string
npx eas secret:create --name EXPO_PUBLIC_RC_GOOGLE_KEY --value "goog_..." --type string
npx eas secret:create --name EXPO_PUBLIC_PRICING_API_URL --value "https://your-api.example.com" --type string
```

Optional: `EXPO_PUBLIC_RC_ENTITLEMENT`, `EXPO_PUBLIC_DEVELOPER_EMAIL`, `EXPO_PUBLIC_ESTIMATE_ACCEPT_URL`, `EXPO_PUBLIC_CUSTOMER_REQUEST_URL` — see `env.example`.

### TestFlight / beta full access

Unlock all subscription gates (Boss Man tier, no paywalls) for beta testers:

| Channel | How beta unlocks |
|--------|-------------------|
| **TestFlight / internal iOS** | Build with **`preview`** profile (`EXPO_PUBLIC_BETA_FULL_ACCESS=true` in `eas.json` → `app.config.js` `extra.betaFullAccess`) |
| **Android internal APK** | Same **`preview`** profile |
| **Public App Store / Play** | **`production`** profile only — **no** beta flag; normal RevenueCat gating |
| **Expo Go (local dev)** | `EXPO_PUBLIC_BETA_FULL_ACCESS=true` in `my-app/.env`, then `npx expo start -c` |

**Do not** add `EXPO_PUBLIC_BETA_FULL_ACCESS` to the **`production`** profile in `eas.json`. Production store releases must use normal entitlements.

Implementation: `lib/betaAccess.ts` (`isBetaFullAccessEnabled`, `resolveIsBetaFullAccess`), `lib/subscriptionGating.ts` (all gates return true when beta), `SubscriptionContext` (`activeTier` → `boss` when beta), Subscribe screen **“Beta — Full access (Boss Man)”** banner.

The app does **not** import `expo-testflight` (removed — caused crashes). Optional `expo-application` release-type logging only; the reliable switch is the **preview** build flag.

Local override (optional): add to `.env` then restart Metro with cache clear:

```env
EXPO_PUBLIC_BETA_FULL_ACCESS=true
```

**RevenueCat:** Products `ideal_starter_monthly`, `ideal_pro_monthly`, `ideal_boss_monthly`; entitlements `ideal_starter`, `ideal_pro`, `ideal_boss`. Subscriptions only work in **native** builds (development / preview / production), not Expo Go.

### Subscriptions disabled for testing (current default)

All builds currently ship with **`subscriptionsDisabled: true`** in `app.config.js` (`SUBSCRIPTIONS_DISABLED_FOR_TESTING`). That unlocks Boss Man tier, bypasses paywalls, and skips RevenueCat init/purchases. Subscribe shows **“Subscriptions disabled for testing”**.

**Before App Store / Play launch:** follow **[SUBSCRIPTIONS_BEFORE_LAUNCH.md](./SUBSCRIPTIONS_BEFORE_LAUNCH.md)** — set `SUBSCRIPTIONS_DISABLED_FOR_TESTING = false`, restore RC keys, use **production** profile for store builds.

Local Metro: `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=true` in `.env` (optional if app.config already hardcodes `true`).

---

## 6. First builds

Scripts set `EAS_NO_VCS=1` so builds work when git metadata is missing or the folder is not a clean repo (common with OneDrive paths). Remove that env var if you want EAS to require git.

### Development (dev client)

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npm run eas:build:development:android
npm run eas:build:development:ios
```

Install the build, then start Metro:

```powershell
npx expo start --dev-client
```

### Preview (internal testing)

Preview builds bake in beta full access via env (`eas.json` → `preview.env.EXPO_PUBLIC_BETA_FULL_ACCESS`).

```powershell
npm run eas:build:preview:android
npm run eas:build:preview:ios
```

### TestFlight (preview IPA — beta full access)

Build iOS with the **preview** profile, then upload the IPA to App Store Connect → TestFlight:

```powershell
npm run eas:build:preview:ios
```

Testers see **Beta — Full access** on Subscribe and get Boss Man gating without purchase. For the **public App Store** release (normal subscriptions), use **production** only:

```powershell
npm run eas:build:production:ios
```

### Production (stores)

```powershell
npm run eas:build:production:android
npm run eas:build:production:ios
# or both:
npm run eas:build:all -- --profile production
```

List builds:

```powershell
npx eas build:list
```

---

## 7. Employee app (separate bundle ID)

Employee builds use `APP_VARIANT=employee` (set in `eas.json` profile env). `app.config.js` switches to `com.idealsolutions.employee`, slug `ideal-solutions-employee`, and employee branding. Local dev: `npm run start:employee`.

```powershell
npm run eas:build:employee-ios
npm run eas:build:employee-android
```

See [docs/DUAL_APP_ARCHITECTURE.md](./docs/DUAL_APP_ARCHITECTURE.md).

---

## 8. npm scripts reference

| Script | Profile | Platform |
|--------|---------|----------|
| `npm run eas:build:development:ios` | development | iOS simulator |
| `npm run eas:build:development:android` | development | Android APK |
| `npm run eas:build:preview:ios` | preview | iOS internal |
| `npm run eas:build:preview:android` | preview | Android internal |
| `npm run eas:build:production:ios` | production | iOS App Store (+ `eas:prepare`) |
| `npm run eas:build:production:android` | production | Play AAB (+ `eas:prepare`) |
| `npm run eas:build:ios` | production | iOS (shortcut) |
| `npm run eas:build:android` | production | Android (shortcut) |
| `npm run eas:build:all` | production | Both (+ `eas:prepare`) |
| `npm run eas:build:employee-ios` | employee-ios | Employee iOS store |
| `npm run eas:build:employee-android` | employee-android | Employee Play AAB |
| `npm run eas:submit:ios` | submit production | Latest iOS build → ASC |
| `npm run eas:submit:android` | submit production | Latest Android build → Play |

Add `-- --non-interactive` in CI after credentials exist.

---

## 9. Submit to stores (optional)

After a successful **production** build:

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npm run eas:submit:ios
npm run eas:submit:android
```

iOS submit uses `ascAppId` **6771799454** from `eas.json` → `submit.production.ios`.

Configure App Store Connect / Google Play app records using bundle ID **`com.idealsolutions.app`**. First submission usually needs store listing, privacy policy, and subscription products linked in RevenueCat.

---

## 10. Troubleshooting

### Windows (git / VCS warnings)

If `eas build` prints **git command not found** or **git --help exited with status undefined**, Git is missing, broken, or not on `PATH` (common on OneDrive copies without a full repo).

**Reliable fix:** use `EAS_NO_VCS=1` so EAS skips git metadata. All `npm run eas:*` scripts already set this via `cross-env`.

**One-off build in PowerShell** (no Git required):

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"; $env:EAS_NO_VCS=1; npx eas build --profile preview --platform android
```

Change `--profile` / `--platform` as needed. Prefer `npm run eas:build:preview:android` (etc.) so you do not have to set the variable each time.

**Alternative:** install [Git for Windows](https://git-scm.com/download/win), ensure `git` works in a new terminal (`git --version`), then you may omit `EAS_NO_VCS=1`.

`EAS_NO_VCS` in `.env` is **not** read automatically by EAS CLI; npm scripts (or the PowerShell line above) are the reliable approach.

`eas.json` → `cli.version` is pinned to the project’s `eas-cli` devDependency (see `package.json`) so the “Found eas-cli in your project dependencies” warning goes away.

### Android: `google-services.json` / FCM (push notifications)

Remote push on Android (`expo-notifications` → `getExpoPushTokenAsync`) needs Firebase Cloud Messaging. The app uses **Expo push** (not `@react-native-firebase`); EAS or a local `google-services.json` supplies FCM.

**Package name must match:** `com.idealsolutions.app` (`app.json` → `expo.android.package`).

#### Option A — EAS-managed FCM (cloud builds)

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\my-app"
npx eas credentials --platform android
```

Follow prompts to upload or generate FCM credentials. EAS injects them during cloud builds.

#### Option B — Local `google-services.json` (prebuild / Android Studio)

1. Open [Firebase console](https://console.firebase.google.com/) → your project (or create one).
2. **Project settings** → **Your apps** → **Add app** → **Android**.
3. Register package **`com.idealsolutions.app`**.
4. Download **`google-services.json`** (do not commit — listed in `.gitignore`).
5. Place at **`my-app/google-services.json`** (project root, next to `app.config.js`).
6. `app.config.js` auto-wires `android.googleServicesFile` when that file exists.
7. Regenerate native Android project:

```powershell
npm run prebuild:android
```

For **EAS cloud builds**, you can also upload the same file via `eas credentials`, or rely on Option A.

#### Separate Android Studio project (`IdealSolutionsPro`)

The native Kotlin project at `C:\Users\trace\AndroidStudioProjects\IdealSolutionsPro` is **not** generated from this Expo app. It uses **Firebase AI** (`firebase-ai`) with package **`com.example.idealsolutionspro`**. It needs its **own** `google-services.json` at:

`C:\Users\trace\AndroidStudioProjects\IdealSolutionsPro\app\google-services.json`

See `FIREBASE_SETUP.md` in that folder.

### General

- **Bundle ID / package already taken:** Change `ios.bundleIdentifier` and `android.package` in `app.json` to IDs you own, then rebuild.
- **OneDrive / path with spaces:** Always quote the path in `cd` (see commands above).
- **Push token errors:** Set `EXPO_PUBLIC_EAS_PROJECT_ID`, ensure FCM/`google-services.json` for Android, then rebuild; refresh token in Settings → User info.
- **Purchases fail in build:** Add RevenueCat keys to EAS secrets and use a **development** or **preview** build, not Expo Go.

---

## Quick checklist

1. `npm install` in `my-app`
2. `npx eas login`
3. `npx eas init` → copy project ID to `.env`
4. `npx eas build:configure`
5. `npx eas secret:create` for RevenueCat + production API URLs
6. `npm run eas:build:preview:android` (or iOS) for first test artifact
7. `npm run eas:build:production:android` when ready for Play Console / App Store Connect
