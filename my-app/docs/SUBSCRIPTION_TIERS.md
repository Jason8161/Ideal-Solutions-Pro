# Ideal Solutions Pro — subscription tiers

Contractor-focused plan names and feature gates. Store **product IDs are unchanged** where possible; only in-app tier IDs and copy changed.

## Tier IDs

| Tier ID | Label | Price | RevenueCat product | Entitlement |
|---------|--------|-------|-------------------|-------------|
| `helper` | Helper Mode | Free (7-day trial) | — | — |
| `side_job` | Side Job / DIY Mode | $9.99/mo | `ideal_starter_monthly` | `ideal_starter` |
| `bossman` | Bossman Mode | $19.99/mo · $100/yr | `ideal_solutions_pro_monthly` / `ideal_solutions_pro_yearly` | `ideal_solutions_pro` |
| `super_bossman` | Super Bossman | $75/mo | `ideal_boss_monthly` | `ideal_boss` |

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

Keep existing product IDs; link entitlements as in table above. **Update store prices** in App Store Connect / Google Play Console to match in-app display:

| Product ID | Display price | Store action |
|------------|---------------|--------------|
| `ideal_starter_monthly` | $9.99/mo | Confirm price |
| `ideal_pro_monthly` | $24.99/mo | **Change from $19.99** |
| `ideal_boss_monthly` | $75/mo | Confirm price |

Helper Mode has no store product (free 7-day trial only). Optional future product for Super Bossman pricing: reuse `ideal_boss_monthly` until a dedicated SKU is added.
