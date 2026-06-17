# Subscription & trial (Ideal Solutions Pro)

## Local-first storage

- Photos, videos, and PDFs are stored **on device only** (`lib/subscriptions/storagePolicy.ts`).
- The app does **not** upload job media to Supabase or app cloud storage.
- Onboarding and **Settings → Storage & cloud backup** ask whether the user uses iCloud, OneDrive, Google Drive, or Dropbox and recommend external backup.

## Tiers (RevenueCat)

| Tier | Price | Employees | AI / month |
|------|-------|-----------|------------|
| Side Hustle / DIY | $9.99 | 0 | 50 |
| Boss Man | $19.99 | 0 | 100 |
| Super Boss Man | $49.99 | 8 | 150 |
| Enterprise Boss Man | $99.99 | 15 | 200 |

Product IDs: `docs/REVENUECAT_PRODUCTS.md`

## Guest trial (no app account)

1. User accepts legal documents (`LegalAcceptanceGate`).
2. User picks an **interest tier** on `/onboarding/tier-trial` — **no app sign-in required**.
3. **Start free trial** runs a RevenueCat `purchasePackage` for the chosen tier’s monthly SKU (App Store / Play intro trial). RevenueCat uses an **anonymous App User ID** until the user signs in.
4. Trial grants **full feature access to that tier** for 7 days (store intro offer + in-app gates).
5. **5 AI requests total** during trial (no monthly reset) — hard stop at 5 unless a paid entitlement is active.
6. No cloud storage (same local-only policy).

**Employee access** from the tier picker still uses the local device trial marker (`startProTrial`) and routes to `/employee/join` — no store purchase on that path.

On trial expiry **or** 5 AI used (without an active store subscription): `subscriptionLocked` → `/upgrade`. Local data is preserved.

## Subscribe (account required)

1. User chooses a paid plan (Settings → Subscription or upgrade flow).
2. App prompts **Create account** or **Sign in** before store checkout.
3. On sign-in, `linkProTrialToUser` attaches the device trial to `userId`.
4. RevenueCat anonymous customer is merged via `Purchases.logIn(userId)` (see below).
5. Purchase completes through RevenueCat / App Store / Play.

## Trial safeguards

Tracked locally and (when configured) in Supabase `trial_records`:

- `deviceId` (primary for guest trials), then `userId` after link
- `email`, `appleId`, `googleId` when available
- `interest_tier`, `trial_start_date`, `trial_used`, `ai_requests_used`

One trial per device and one per verified account (`lib/subscriptions/trialStorage.ts`, `supabaseTrial.ts` stubs).

## RevenueCat anonymous ID

- `Purchases.configure()` creates an **anonymous** RevenueCat app user id for onboarding trial purchases and pre-account subscriptions.
- When the user creates an account, `loginRevenueCatUser` calls `Purchases.logIn(appUserId)` to alias the anonymous customer to the app user id (entitlements transfer per RevenueCat rules).
- `logoutRevenueCatUser` (`Purchases.logOut()`) runs on sign-out so the next guest session gets a fresh anonymous id.

## AI add-ons

Monthly packs: +100, +500, +2000, +5000 — see `AI_ADDON_PACKS` in `lib/subscriptions/tiers.ts`.

Usage UI: **Settings → AI usage** (75% warning, block at limit).

## Dev / testing

`SUBSCRIPTIONS_DISABLED_FOR_TESTING` in `app.config.js` grants **Enterprise Boss Man** without purchases. Do not ship with this enabled.

## Code map

| Module | Role |
|--------|------|
| `lib/subscriptions/tiers.ts` | Plans, limits, RevenueCat IDs |
| `lib/subscriptions/trialPolicy.ts` | Trial state machine |
| `lib/subscriptions/trialStorage.ts` | Local trial, guest start, account link |
| `lib/subscriptions/aiQuota.ts` | Monthly + trial AI quotas |
| `context/SubscriptionContext.tsx` | RevenueCat, effective tier, quota |
| `lib/subscription/featureAccess.ts` | Feature gates |
| `components/auth/AuthGate.tsx` | Guest trial + public route access |
| `components/onboarding/TrialOnboardingGate.tsx` | Onboarding + upgrade routing |
