# Ideal Solutions Pro — subscription tiers

Contractor-focused plan names and feature gates. Tier IDs and RevenueCat product IDs are defined in `lib/subscriptions/tiers.ts`.

## Tier IDs (v2)

| Tier ID | Label | Price | Store product ID | Entitlement |
|---------|--------|-------|------------------|-------------|
| `locked` | Trial ended | — | — | — |
| `side_hustle` | Side Hustle / DIY | $9.99/mo | `Side_Job_DIY` | `side_hustle` |
| `boss_man` | Boss Man | $19.99/mo | `idealsolutionspro.BossManMode` | `ideal_solutions_pro` |
| `super_boss_man` | Super Boss Man | $49.99/mo | `idealsolutionspro.SuperBossManMode` | `super_boss_man` |
| `enterprise_boss_man` | Enterprise Boss Man | $99.99/mo | `idealsolutionspro.EnterpriseBossMan` | `enterprise_boss_man` |

**Employee Access** is not a paid tier — invitation-code flow only, no RevenueCat purchase.

### Legacy ID migration (profile / dev overrides)

| Legacy | New |
|--------|-----|
| `free_trial` | `helper` |
| `starter` | `side_job` |
| `pro` | `bossman` |
| `boss` | `super_bossman` |

Legacy entitlement key `pro` (app.config `entitlementId`) maps to **Bossman** tier.

## Feature matrix

| Feature | Helper | Side Job | Bossman | Super Bossman |
|---------|:------:|:--------:|:-------:|:-------------:|
| AI questions / day | 5 | 5 | Unlimited | Unlimited |
| Social media | Yes | Yes | Yes | Yes |
| Basic job folders | Yes | Yes | Yes | Yes |
| Calendar | — | Yes | Yes | Yes |
| Estimate photo uploads | — | Yes | 5/day | Unlimited |
| Material search (retail) | HD / Lowe's / Ace | Same | Same + wholesale | Same |
| Supply houses (Graybar, Rexel, City Electric, Grainger) | — | — | Yes | Yes |
| Employees / crew | — | — | Yes | Yes |
| Service calls | — | — | Yes | Yes |
| Accounting / billing | — | — | Yes | Yes |
| Banking / payment setup | — | — | Yes | Yes |
| Getting Paid (Cash App, Venmo, Square) | — | — | Yes | Yes |
| Blueprint uploads | — | — | — | Yes |
| Large files | — | — | Yes | Yes |
| Advanced AI | — | — | — | Yes |
| Crew AI included | — | — | Yes | Yes |

## Code map

- `lib/subscription/tiers.ts` — tier metadata, RC mapping, retail/wholesale supplier IDs
- `lib/subscription/featureAccess.ts` — `canAccessFeature`, `getUpgradeTarget`, home tile gates, materials filter
- `lib/subscription/dailyUsage.ts` — daily AI + image counters (AsyncStorage)
- `lib/subscription/trialStorage.ts` — 7-day Helper trial from first launch / accept
- `lib/subscriptionPlans.ts` / `lib/subscriptionGating.ts` — re-exports for existing imports
- `lib/revenuecat/` — RevenueCat SDK wrapper (configure, paywall, Customer Center)
- `context/SubscriptionContext.tsx` — RevenueCat, trial state, daily usage on subscribe screen
- `components/subscription/UpgradePromptModal.tsx` — jobsite upgrade copy → `/settings/subscribe`
- `components/subscription/FeatureGate.tsx` — wrap routes (service calls, Getting Paid, etc.)

## Helper trial

- Clock starts on first app open (`ensureHomeBoot` → `recordHelperTrialStartIfNeeded`) or plan picker / legal accept (`recordHelperTrialAccepted`).
- Duration: **7 days** (`HELPER_TRIAL_DAYS`).
- After expiry, without a paid entitlement, `helperTrialExpired` blocks gated features (subscribe screen still available).

## RevenueCat dashboard

Store product IDs must match App Store Connect / Google Play and the table above. See `docs/REVENUECAT_PRODUCTS.md` for legacy SKU fallbacks.

| Product ID | Display price |
|------------|---------------|
| `Side_Job_DIY` | $9.99/mo |
| `idealsolutionspro.BossManMode` | $19.99/mo |
| `idealsolutionspro.SuperBossManMode` | $49.99/mo |
| `idealsolutionspro.EnterpriseBossMan` | $99.99/mo |

Employee Access has no store product (invitation code only).
