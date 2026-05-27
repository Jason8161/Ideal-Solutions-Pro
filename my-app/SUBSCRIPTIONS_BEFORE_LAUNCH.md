# Re-enable subscriptions before App Store / Play launch

Subscriptions are **off for testing**: Boss Man tier everywhere, no paywalls, RevenueCat not configured, purchases disabled on Subscribe / plan picker.

## Flags (turn subscriptions back on)

| Location | What to change |
|----------|----------------|
| **`app.config.js`** | Set `SUBSCRIPTIONS_DISABLED_FOR_TESTING = false` (top of file). This is baked into **all EAS builds** (TestFlight, preview, production) until you change it and rebuild. |
| **`my-app/.env`** (local Metro) | Remove or set `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=false`, then `npx expo start -c`. |
| **`.env.example`** | Document only — set `false` or omit for production docs. |

Runtime checks: `lib/subscriptionTesting.ts` → `isSubscriptionGatingDisabled()` reads `extra.subscriptionsDisabled` and `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED`.

## Before launch — 3 steps

1. **Disable testing mode** — In `app.config.js`, set `SUBSCRIPTIONS_DISABLED_FOR_TESTING = false`. In `.env`, remove `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=true` (or set `false`). Re-run your subscription / gating implementation if you rewrote it since this testing period.
2. **Restore RevenueCat** — Add `EXPO_PUBLIC_RC_APPLE_KEY` and `EXPO_PUBLIC_RC_GOOGLE_KEY` to EAS secrets and `.env`. Build with **production** profile (`npm run eas:build:production:ios` / `android`). Confirm Subscribe shows live plans and purchases work in a dev client or TestFlight build **without** the testing banner.
3. **Preview vs production** — Use **preview** only for internal QA with `EXPO_PUBLIC_BETA_FULL_ACCESS=true` if you still want beta unlock without purchases. **Production** store releases must have `subscriptionsDisabled: false`, no beta full-access flag, and normal `lib/subscriptionGating.ts` behavior.

See also **EAS_SETUP.md** § TestFlight / beta and § Environment variables.
