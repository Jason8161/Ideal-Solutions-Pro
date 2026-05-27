# Crew AI (included with app subscription)

AI for owners and crew is **included with the Ideal Solutions app subscription**. There is no separate in-app AI purchase path for contractors or employees. Fair-use daily/monthly limits still apply per tier.

## Billing model (MVP)

| Who | Pays for | AI access |
|-----|----------|-----------|
| Owner / contractor | App tier (Starter / Pro / Boss) | `OWNER_AI_LIMITS` by `SubscriptionContext.activeTier` |
| Crew (employee session) | Nothing separately | Pro+ company tier → `pro_employee` crew limits; otherwise starter crew allowance |

### Owner limits (`OWNER_AI_LIMITS`)

| App tier | Daily | Monthly |
|----------|-------|---------|
| Helper (free trial) | 5 | 150 |
| Side Job / DIY ($9.99) | 5 | 200 |
| Bossman ($24.99) | Fair use (no hard cap in app) | Fair use |
| Super Bossman ($75) | Fair use (no hard cap in app) | Fair use |

### Crew limits (`EMPLOYEE_AI_LIMITS`)

| Effective crew tier | When | Daily | Monthly |
|---------------------|------|-------|---------|
| `free` | Company below Pro | 5 | 50 |
| `pro_employee` | Company Pro+ or sponsored policy | 50 | 600 |
| `field_supervisor` | Legacy RC entitlement / dev only | Fair use | Fair use |

`ownerSubscriptionIncludesCrewAi()` is true for **Pro Contractor** and **Boss Man**. That auto-grants `pro_employee` crew tier without employee self-serve checkout.

## Architecture

```
app/ai-assistance.tsx, photo-to-estimate.tsx
  useAiAccess() → resolveAiAccess()
    owner → OWNER_AI_LIMITS
    employee → EMPLOYEE_AI_LIMITS + companyAiIncluded (Pro+)
  AiUsageBanner — CTA to /settings/subscribe only on free trial (owners) or pre-Pro crew hard limit
```

## RevenueCat product IDs (unchanged)

Store products and entitlements are **not renamed** in this MVP (copy/UI only). Dashboard may still list legacy employee SKUs:

| Product ID | Notes |
|------------|--------|
| `ideal_starter_monthly` | Owner Starter |
| `ideal_pro_monthly` | Owner Pro — includes owner + crew AI in-app |
| `ideal_boss_monthly` | Owner Boss |
| `ideal_employee_pro_monthly` | **Legacy** — in-app purchase disabled; entitlements still honored if active |
| `ideal_employee_supervisor_monthly` | **Legacy** — same |

Set `EMPLOYEE_AI_SELF_SERVE_PURCHASES_ENABLED = false` in `lib/employeeAi/employeePurchases.ts` to keep employee checkout off while preserving `readEmployeeTierFromStore()` for grandfathered subscribers.

## Files

| Path | Role |
|------|------|
| `lib/subscriptionPlans.ts` | Plan copy — AI included per tier |
| `lib/employeeAi/companyAiIncluded.ts` | Pro+ crew inclusion helpers |
| `lib/employeeAi/access.ts` | Resolve actor, tiers, limits, messages |
| `lib/employeeAi/limits.ts` | Limit tables |
| `lib/employeeAi/employeePurchases.ts` | RC read; purchase gated off |
| `lib/companyAiPolicy.ts` | Default `company_sponsored` |
| `components/employeeAi/AiUsageBanner.tsx` | Fair-use warnings |
| `app/settings/employee-ai.tsx` | Crew AI settings (no employee checkout) |
| `app/settings/subscribe.tsx` | App subscription only |

## How to test

1. **Owner free trial** — AI Assistance until daily cap; banner CTA → Settings → Subscription.
2. **Owner Pro** — higher limits; at cap, message mentions included subscription (no separate AI SKU).
3. **Crew on Pro** — Settings → Crew AI → simulate employee session → `pro_employee` limits; banner shows “Included with your company subscription”.
4. **Crew below Pro** — Starter/free company tier → 5/day crew allowance; no employee purchase cards.
5. **Legacy entitlement** — `__DEV__` simulate tier or active `ideal_employee_supervisor` in RevenueCat still respected when policy is `byo`.

## Future work

- Server-side enforcement of limits per company / employee
- Boss-tier crew fair-use tuning vs `field_supervisor` legacy
- Retire legacy employee products in stores when grandfather period ends
