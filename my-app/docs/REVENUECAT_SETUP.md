# RevenueCat setup — Ideal Solutions Pro (Expo / React Native)

This app uses **`react-native-purchases`** and **`react-native-purchases-ui`** (npm), **not** Swift Package Manager. SPM is for native SwiftUI apps only. After changing env or native deps, **rebuild the dev client or run an EAS build** — Expo Go does not include these modules.

## Environment variables

Copy from `.env.example` into `my-app/.env`:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | Universal API key (test or prod). Used when platform keys are unset. |
| `EXPO_PUBLIC_RC_APPLE_KEY` | Optional iOS-specific key (`appl_…`) |
| `EXPO_PUBLIC_RC_GOOGLE_KEY` | Optional Android-specific key (`goog_…`) |
| `EXPO_PUBLIC_RC_ENTITLEMENT` | Entitlement identifier (default: `ideal_solutions_pro`) |

**Warning:** The bundled test key (`test_…`) is sandbox-only. Use production Apple/Google keys before App Store / Play release.

## RevenueCat dashboard

### 1. Entitlement

| Identifier | Display name |
|------------|--------------|
| `ideal_solutions_pro` | Ideal Solutions Pro |

Links to **Bossman Mode** tier in-app (`bossman`). Legacy entitlements (`ideal_starter`, `ideal_pro`, `ideal_boss`, `pro`) still work for existing subscribers.

### 2. Store products (App Store Connect + Google Play)

Create matching subscription products in both stores:

| Product ID | Price | Billing |
|------------|-------|---------|
| `ideal_solutions_pro_monthly` | $19.99 | Monthly auto-renew |
| `ideal_solutions_pro_yearly` | $100.00 | Annual auto-renew |

**Legacy tier products** (optional, for 4-tier picker):

| Product ID | Tier | Price |
|------------|------|-------|
| `ideal_starter_monthly` | Side Job | $9.99/mo |
| `ideal_pro_monthly` | Bossman (legacy) | $19.99/mo |
| `ideal_boss_monthly` | Super Bossman | $75/mo |

### 3. Offering (default)

1. Create products in RevenueCat linked to store SKUs above.
2. Add packages to the **default** offering:
   - **Monthly** → `ideal_solutions_pro_monthly` (package id: `$rc_monthly` or `monthly`)
   - **Annual** → `ideal_solutions_pro_yearly` (package id: `$rc_annual` or `yearly`)
3. Attach both products to entitlement **`ideal_solutions_pro`**.

### 4. Paywall & Customer Center

- Configure a Paywall template in RevenueCat → Paywalls, linked to the default offering.
- Enable Customer Center in Project settings (requires `react-native-purchases-ui` in the native build).

## Code map

- `lib/revenuecat/` — configure, customer info, entitlements, purchase/restore, paywall, customer center
- `context/SubscriptionContext.tsx` — app-wide subscription state
- `app/settings/subscribe.tsx` — manage plans, paywall, Customer Center
- `components/onboarding/PlanPickerScreen.tsx` — onboarding purchase flow

## Testing checklist

1. Set `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=false` and flip `SUBSCRIPTIONS_DISABLED_FOR_TESTING` in `app.config.js` before real purchase tests.
2. Rebuild: `npm run eas:build:development:ios` or `prebuild:ios` + Xcode.
3. Use a sandbox Apple ID / Google Play test account.
4. Verify entitlement in Settings → Subscription and feature gates (e.g. supply houses, Getting Paid).
