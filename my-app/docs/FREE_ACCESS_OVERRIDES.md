# Free access overrides (admin-granted subscriptions)

Complimentary Ideal Solutions Pro tiers are stored in Supabase and applied **after** RevenueCat. Paid store entitlements always win so real subscribers are never downgraded and free-grant users are never sent through checkout unless they choose to subscribe.

## Database (`free_access_overrides`)

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | `text` (unique) | App account id (`AuthSession.userId`, e.g. `local_…` or API user id) |
| `email` | `text` | Searchable / display email |
| `username` | `text` | Optional searchable handle |
| `free_access_enabled` | `boolean` | Master switch (revoke without deleting row) |
| `free_access_tier` | `text` | `side_hustle`, `boss_man`, `super_boss` / `super_boss_man`, `enterprise_boss` / `enterprise_boss_man` |
| `free_access_start_date` | `timestamptz` | Grant start (default `now()`) |
| `free_access_expiration_date` | `timestamptz` | `NULL` = lifetime |
| `free_access_reason` | `text` | Internal note (partner, promo, support ticket, …) |
| `granted_by_admin_user_id` | `text` | Admin who last saved the row |

Admins are listed in `app_subscription_admins` (`user_id`, `email`).

Migration: `supabase/migrations/002_free_access_overrides.sql`

## Setup

1. Create a Supabase project and run migrations `001` then `002`.
2. In the app `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Seed your owner account:
   ```sql
   insert into public.app_subscription_admins (user_id, email)
   values ('YOUR_USER_ID', 'you@company.com')
   on conflict (user_id) do nothing;
   ```
4. Optional in-app admin allowlist (no SQL): `EXPO_PUBLIC_APP_ADMIN_EMAILS=you@company.com,other@company.com` in `.env` (also `app.config.js` → `extra.appAdminEmails`).

Restart Metro after env changes.

## Admin workflow

1. Sign in with an admin account.
2. **Settings → Billing & payments → Subscription**.
3. Open **Admin: free access** (link only appears for admins).
4. Search existing overrides by email, username, or user id.
5. Enter **User ID** (required), optional email/username, pick **tier** and **duration** (30d / 90d / 1y / lifetime / custom date), add a reason, tap **Save override**.

RPCs (enforced server-side):

- `search_free_access_overrides(p_admin_user_id, p_query, p_limit)`
- `upsert_free_access_override(...)`
- `get_active_free_access_override(p_user_id)` — read path for the app

Users cannot insert or update their own tier; RLS + `SECURITY DEFINER` RPCs require `app_subscription_admins` membership for writes.

### Supabase dashboard–only grants

You can upsert directly in Table Editor or SQL:

```sql
select public.upsert_free_access_override(
  'ADMIN_USER_ID',
  'TARGET_USER_ID',
  'user@example.com',
  'display_name',
  true,
  'boss_man',
  now(),
  now() + interval '90 days',
  'Launch partner'
);
```

## Access resolution order (app)

Implemented in `lib/subscription/accessResolver.ts` and wired in `context/SubscriptionContext.tsx`:

1. **Testing / beta** — `SUBSCRIPTIONS_DISABLED_FOR_TESTING` or `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=true` → Enterprise Boss Man, no RevenueCat purchases (`lib/subscriptionTesting.ts`).
2. **Dev tier simulation** (`__DEV__` only).
3. **RevenueCat** — active paid entitlement → that tier; purchases and restore unchanged.
4. **Supabase override** — `free_access_enabled` and not past `free_access_expiration_date` → mapped tier; user is treated as having paid access (no paywall); **no store charge**.
5. **Profile cache** — offline `subscriptionTier` on device.
6. **Trial** — 7-day interest tier + 5 AI requests.
7. **Locked** — subscribe screen / upgrade prompts.

If both RevenueCat and an override are active, **RevenueCat wins** for `activeTier`. Settings still show the admin grant for transparency.

## User-facing UI

- **Settings → Subscription** and **Settings → User info**: **Access type** card when a row exists — “Free Admin Access”, tier name, expiration (or Lifetime).
- Expired or disabled overrides do not unlock features; user sees subscribe flow like any lapsed trial.

## RevenueCat safety

- Override users never need a store subscription; the app does not auto-purchase.
- Paying customers keep store entitlements; override is informational if both exist.
- With `SUBSCRIPTIONS_DISABLED_FOR_TESTING`, RevenueCat is not configured; overrides are still loaded but testing mode unlocks everything first.

## Code map

| Path | Role |
|------|------|
| `lib/subscription/freeAccessOverride.ts` | Fetch, map, admin upsert/search helpers |
| `lib/subscription/accessResolver.ts` | Tier precedence |
| `lib/auth/subscriptionAdmin.ts` | Admin detection (env + `app_subscription_admins`) |
| `lib/supabase/client.ts` | Minimal RPC client |
| `app/settings/admin-free-access.tsx` | In-app admin UI |
| `components/subscription/FreeAccessStatusCard.tsx` | Profile / subscription display |
