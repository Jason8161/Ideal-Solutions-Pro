# RevenueCat setup — Ideal Solutions Pro (Expo / React Native)

## Why not Swift Package Manager?

This app is **Expo / React Native**, not SwiftUI. RevenueCat’s **Swift Package (`purchases-ios-spm`)** is for native Apple apps only.

Use the npm packages already in this project:

| Package | Purpose |
|---------|---------|
| `react-native-purchases` | Configure SDK, customer info, purchase/restore |
| `react-native-purchases-ui` | RevenueCat Paywall + Customer Center (v10+) |

After changing env vars or native deps, **rebuild the dev client or run an EAS build**. Expo Go does **not** ship these native modules.

## Environment variables

Copy from `.env.example` into `my-app/.env`:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | Universal API key (test or prod). Used when platform keys are unset. |
| `EXPO_PUBLIC_RC_APPLE_KEY` | Optional iOS-specific key (`appl_…`) — preferred for production |
| `EXPO_PUBLIC_RC_GOOGLE_KEY` | Optional Android-specific key (`goog_…`) — preferred for production |
| `EXPO_PUBLIC_RC_ENTITLEMENT` | Entitlement identifier (default: `ideal_solutions_pro`) |
| `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED` | `true` bypasses RevenueCat for local testing |

`app.config.js` bakes keys into `expo.extra` at build time. For EAS production, set secrets:

```bash
npx eas secret:create --name EXPO_PUBLIC_RC_APPLE_KEY --value appl_xxxxxxxx
npx eas secret:create --name EXPO_PUBLIC_RC_GOOGLE_KEY --value goog_xxxxxxxx
```

**Warning:** The bundled test key (`test_…`) is **sandbox-only**. Use production Apple/Google keys before App Store / Play release.

### API key prefixes (do not mix these up)

| Prefix | Name | Where it goes |
|--------|------|---------------|
| `appl_` | Public SDK key (iOS) | `EXPO_PUBLIC_RC_APPLE_KEY` — safe to bundle in the app |
| `goog_` | Public SDK key (Android) | `EXPO_PUBLIC_RC_GOOGLE_KEY` |
| `test_` | Sandbox public key | Local dev / development builds only |
| `sk_` | **Secret API key** | **Server-only** (backend, CI, RevenueCat REST). **Never** in `EXPO_PUBLIC_*`, `.env` committed to git, or EAS client env — anyone with the app binary could extract it |

The app validates keys in `lib/revenuecat/purchases.ts`: iOS accepts only `appl_` or `test_`; a `sk_` key is rejected and purchases will not configure.

**Do not** set `EXPO_PUBLIC_RC_APPLE_KEY` or `EXPO_PUBLIC_REVENUECAT_API_KEY` to a 10-character Apple Team ID, Key ID, Issuer ID fragment, or a `sk_` secret. EAS needs the full RevenueCat **Public** key (`appl_…`).

## Your credentials (inventory)

| Item | Value / location | Used for |
|------|------------------|----------|
| **Key ID** | `6F2Z3XAJFJ` | RevenueCat App Store Connect credentials + EAS Submit (with `.p8`) |
| **Private key (`.p8`)** | `Downloads\AuthKey_6F2Z3XAJFJ.p8` | Same — upload in RevenueCat; never commit to git |
| **Bundle ID** | `com.idealsolutions.app` | RevenueCat iOS app + App Store Connect |
| **Likely Team ID** | `NS3PLDU4DG` (if 10 chars, no dashes) | Apple Developer / ASC membership — **not** for RevenueCat SDK or EAS `EXPO_PUBLIC_*` |
| **Issuer ID** | UUID from ASC (see below) | RevenueCat App Store Connect credentials only |
| **Still needed** | Full `appl_…` public key | `EXPO_PUBLIC_RC_APPLE_KEY` in EAS + local `.env` |

### What is `NS3PLDU4DG`?

| Format | Example | Meaning |
|--------|---------|---------|
| **Apple Team ID** | `NS3PLDU4DG` (10 letters/digits, no dashes) | Shown in [Apple Developer](https://developer.apple.com/account) → **Membership** and in App Store Connect under your team. Used for signing, EAS `appleTeamId`, etc. **Not** the RevenueCat SDK key. |
| **Issuer ID** | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | App Store Connect API **team** identifier. Copy from ASC → **Users and Access** → **Integrations** → **App Store Connect API** (top of page). Required in RevenueCat with Key ID + `.p8`. |
| **Key ID** | `6F2Z3XAJFJ` (10 chars) | From `AuthKey_6F2Z3XAJFJ.p8` filename — API key name, not Team ID. |
| **RevenueCat Public key** | `appl_` + long string | **Only** this goes in `EXPO_PUBLIC_RC_APPLE_KEY`. |

If you only have `NS3PLDU4DG` and `6F2Z3XAJFJ`, you still need the **Issuer ID** (UUID) and the **`appl_…`** key from RevenueCat.

## Apple AuthKey (`.p8`) vs RevenueCat `appl_` key

These are **different credentials** for different purposes. Do **not** put `.p8` contents or Key ID into `EXPO_PUBLIC_*` env vars, and **never commit** `.p8` files to git (already ignored via `*.p8`).

| Credential | Example | Where it goes | Purpose |
|------------|---------|---------------|---------|
| **App Store Connect API private key** | `AuthKey_6F2Z3XAJFJ.p8` | RevenueCat dashboard + EAS Submit credentials | Lets RevenueCat (and EAS Submit) talk to App Store Connect for receipts, products, and submissions |
| **RevenueCat Public SDK API key** | `appl_…` | `EXPO_PUBLIC_RC_APPLE_KEY` in EAS / `.env` | Lets the **app** initialize the RevenueCat SDK at runtime |

### Connect `.p8` in RevenueCat (server-side)

1. Open [RevenueCat](https://app.revenuecat.com) → your project → **Apps** → **iOS** (`com.idealsolutions.app`).
2. Go to **App Store Connect credentials** (or **Service credentials**).
3. Upload **`AuthKey_6F2Z3XAJFJ.p8`** from your Downloads folder (keep the original outside the repo).
4. Enter **Key ID:** `6F2Z3XAJFJ` (from the filename).
5. Enter **Issuer ID:** from [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **Integrations** → **App Store Connect API** (UUID format, e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). Copy this once — it is shared across all API keys for your team.
6. Save. RevenueCat can now validate App Store receipts and sync products for `com.idealsolutions.app`.

### Copy `appl_` for EAS (client-side)

The in-app “wrong API key” error is fixed by the **Public API key**, not the `.p8`:

1. RevenueCat → **Project settings** → **API keys** (or **Apps** → iOS).
2. Copy the **Public API key** starting with `appl_`.
3. Set on EAS **production** (and preview if using TestFlight):

```bash
npx eas env:create --environment production --name EXPO_PUBLIC_RC_APPLE_KEY --value appl_PASTE_YOUR_KEY_HERE --visibility plaintext --non-interactive
```

4. Rebuild the iOS app so the key is baked into the binary.

## Quick checklist (App Store + EAS)

### A) RevenueCat — connect App Store (server)

1. [RevenueCat](https://app.revenuecat.com) → project → **Apps** → iOS (`com.idealsolutions.app`).
2. **App Store Connect credentials** / **Service credentials**.
3. **Issuer ID:** App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API** → copy the Issuer ID (UUID with dashes).
4. **Key ID:** `6F2Z3XAJFJ`.
5. **Private key:** upload `AuthKey_6F2Z3XAJFJ.p8` from Downloads (do not add to the repo).
6. Save. Optionally note Team ID `NS3PLDU4DG` for your own records — RevenueCat’s form uses Issuer ID + Key ID + `.p8`, not Team ID alone.

### B) RevenueCat — SDK key for EAS (client)

1. RevenueCat → **Project settings** → **API keys** (or iOS app).
2. Copy the **Public** key that starts with `appl_` (full string).
3. Set EAS production (replace with your real key):

```bash
npx eas env:create --environment production --name EXPO_PUBLIC_RC_APPLE_KEY --value appl_PASTE_FULL_KEY_HERE --visibility plaintext --non-interactive
```

4. Rebuild iOS (`eas build`) so the key is embedded.

### C) Where to find Issuer ID

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com).
2. **Users and Access** → **Integrations** tab → **App Store Connect API**.
3. At the top, copy **Issuer ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
4. Paste into RevenueCat with Key ID `6F2Z3XAJFJ` and the `.p8` upload.

## RevenueCat dashboard

### 1. Entitlement

| Identifier | Display name | In-app tier |
|------------|--------------|-------------|
| `ideal_solutions_pro` | Ideal Solutions Pro | Boss Man (`boss_man`) |

Legacy entitlements (`ideal_starter`, `ideal_pro`, `ideal_boss`, `pro`, `boss_man`, etc.) still map to the correct tiers for existing subscribers.

### 2. Store products (App Store Connect + Google Play)

Create matching subscription products in **both** stores, then link them in RevenueCat:

| Product ID | Price | Billing | Maps to |
|------------|-------|---------|---------|
| `side_hustle_monthly` | $9.99 | Monthly auto-renew | Side Hustle |
| `boss_man_monthly` | $19.99 | Monthly auto-renew | Ideal Solutions Pro (Boss Man) |
| `super_boss_man_monthly` | $49.99 | Monthly auto-renew | Super Boss Man |
| `enterprise_boss_man_monthly` | $99.99 | Monthly auto-renew | Enterprise Boss Man |

Optional legacy Boss Man monthly SKUs (still resolved if present in an offering):

| Product ID | Notes |
|------------|-------|
| `ideal_pro_monthly` / `ideal_solutions_pro_monthly` | Alternate Boss Man naming |

### 3. Offering (default)

1. Add products in RevenueCat linked to store SKUs above.
2. Add packages to the **default** offering (one monthly package per tier; package id typically matches product id or `$rc_monthly` for Boss Man).
3. Attach each product to its matching entitlement (`side_hustle`, `ideal_solutions_pro`, `super_boss_man`, `enterprise_boss_man`).

### 4. Paywall & Customer Center

- **Paywall:** RevenueCat → Paywalls → create a template linked to the default offering. The app calls `RevenueCatUI.presentPaywall()` from Settings → Subscription.
- **Customer Center:** Enable in RevenueCat Project settings. Requires `react-native-purchases-ui` in the native build; the app calls `RevenueCatUI.presentCustomerCenter()`.

## Code map

| Path | Role |
|------|------|
| `lib/revenuecat/` | `configurePurchases`, `getCustomerInfo`, entitlement checks, `purchasePackage`, `restorePurchases`, paywall, Customer Center |
| `context/SubscriptionContext.tsx` | App-wide subscription state; configures RevenueCat on launch |
| `app/settings/subscribe.tsx` | Plan picker, monthly subscriptions, paywall, restore, Customer Center |
| `lib/subscriptions/tiers.ts` | Tier metadata + RevenueCat product/entitlement IDs |

## Testing: Expo Go vs dev client vs TestFlight

| Environment | RevenueCat works? | Notes |
|-------------|-------------------|-------|
| **Expo Go** | No | Native module missing — use a dev client |
| **Development build** (`eas build --profile development`) | Yes | Best for sandbox purchases with `test_…` key |
| **Preview / TestFlight** | Yes | Use sandbox Apple ID or production keys per build profile |
| **Production store** | Yes | Production `appl_…` / `goog_…` keys only |

### Checklist

1. Set `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=false` and `SUBSCRIPTIONS_DISABLED_FOR_TESTING=false` in `app.config.js`.
2. Add `EXPO_PUBLIC_REVENUECAT_API_KEY=test_…` (or platform keys) to `.env`.
3. Rebuild: `npm run eas:build:development:ios` or Android equivalent.
4. Start Metro: `npx expo start -c`.
5. Use a **sandbox Apple ID** (iOS) or **Google Play license tester** (Android).
6. Open Settings → Subscription → subscribe, restore, or open Paywall / Customer Center.
7. Confirm entitlement `ideal_solutions_pro` unlocks Boss Man features (supply houses, Getting Paid, etc.).
