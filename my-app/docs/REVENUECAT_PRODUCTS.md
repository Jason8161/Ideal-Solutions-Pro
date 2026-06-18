# RevenueCat product catalog

Create these in **App Store Connect**, **Google Play Console**, and the **RevenueCat** dashboard. Link each product to the matching entitlement in the default offering.

## Subscriptions (monthly)

| Tier ID | Entitlement ID | Store product ID | Price | Display name |
|---------|----------------|------------------|-------|--------------|
| `side_hustle` | `side_hustle` | `Side_Job_DIY` | $9.99/mo | Side Hustle / DIY |
| `boss_man` | `ideal_solutions_pro` | `idealsolutionspro.BossManMode` | $19.99/mo | Boss Man |
| `super_boss_man` | `super_boss_man` | `idealsolutionspro.SuperBossManMode` | $49.99/mo | Super Boss Man |
| `enterprise_boss_man` | `enterprise_boss_man` | `idealsolutionspro.EnterpriseBossMan` | $99.99/mo | Enterprise Boss Man |

The app resolves packages dynamically from `offerings.current.availablePackages` by matching `product.identifier` to `revenueCatProductId` in `lib/subscriptions/tiers.ts`. RevenueCat package identifiers do not need to match store product IDs.

### Legacy store product IDs (still honored)

| Tier | Legacy product IDs |
|------|-------------------|
| Side Hustle | `side_hustle_monthly` |
| Boss Man | `boss_man_monthly`, `ideal_pro_monthly`, `ideal_solutions_pro_monthly` |
| Super Boss Man | `super_boss_man_monthly` |
| Enterprise Boss Man | `enterprise_boss_man_monthly` |

Legacy package identifiers for Boss Man (`$rc_monthly`, `monthly`) are also matched as a fallback.

### Legacy entitlements (still honored)

Existing subscribers may still have:

- `ideal_solutions_pro` → maps to **Boss Man**
- `ideal_starter` → **Side Hustle / DIY**
- `ideal_boss` → **Super Boss Man**
- `pro` (env `EXPO_PUBLIC_RC_ENTITLEMENT`) → **Boss Man**

## AI add-ons (monthly)

| Entitlement ID | Product ID | Price | Credits / month |
|----------------|------------|-------|-----------------|
| `ai_addon_100` | `ai_addon_100_monthly` | $4.99 | 100 |
| `ai_addon_500` | `ai_addon_500_monthly` | $14.99 | 500 |
| `ai_addon_2000` | `ai_addon_2000_monthly` | $39.99 | 2,000 |
| `ai_addon_5000` | `ai_addon_5000_monthly` | $79.99 | 5,000 |

Legacy consumable IDs in `lib/subscription/aiAddons.ts` (`ideal_ai_addon_*`) may remain for existing users; align new dashboard products with the table above.

## Environment

```env
EXPO_PUBLIC_RC_APPLE_KEY=
EXPO_PUBLIC_RC_GOOGLE_KEY=
EXPO_PUBLIC_RC_ENTITLEMENT=pro
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## SQL

Apply `supabase/migrations/001_subscription_trial.sql` when Supabase is wired for trial anti-abuse RPCs.
