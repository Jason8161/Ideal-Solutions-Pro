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

## 7-day trial

1. User signs in with **Apple**, **Google**, or **verified email** (`trialPolicy.authSatisfiesTrialRequirement`).
2. User picks an **interest tier** on `/onboarding/tier-trial`.
3. Trial grants **full feature access to that tier** for 7 days.
4. **5 AI requests total** (no monthly reset) — hard stop at 5.
5. No cloud storage (same local-only policy).

On trial expiry **or** 5 AI used: `subscriptionLocked` → `/upgrade`. Local data is preserved.

## Trial safeguards

Tracked locally and (when configured) in Supabase `trial_records`:

- `userId`, `deviceId`, `email`, `appleId`, `googleId`
- `interest_tier`, `trial_start_date`, `trial_used`, `ai_requests_used`

One trial per verified account and one per device (`lib/subscriptions/trialStorage.ts`, `supabaseTrial.ts` stubs).

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
| `lib/subscriptions/trialStorage.ts` | Local trial + start API |
| `lib/subscriptions/aiQuota.ts` | Monthly + trial AI quotas |
| `context/SubscriptionContext.tsx` | RevenueCat, effective tier, quota |
| `lib/subscription/featureAccess.ts` | Feature gates |
| `components/onboarding/TrialOnboardingGate.tsx` | Onboarding + upgrade routing |
