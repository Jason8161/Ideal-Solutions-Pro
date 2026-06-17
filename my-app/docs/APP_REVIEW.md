# App Store Review — Ideal Solutions Pro

Use this when submitting builds to App Store Connect (Review Notes field) and when testing on iPad before upload.

## Primary path (no login required)

Reviewers **do not need an account** to use the app. This is the intended first-run experience.

1. Install on **iPhone or iPad** (Universal; `supportsTablet: true`).
2. On first launch: home cold splash (~6s) → legal intro → accept all seven agreements.
3. **Choose your plan / Start free trial** opens automatically (`/onboarding/tier-trial`).
4. Pick any subscription tier and tap **Start free trial**.
5. The full app unlocks for **7 days** with **5 AI requests** total — no username or password.

If the sign-in screen appears (e.g. reviewer opened it manually from tier-trial):

- Tap **Start 7-day free trial — No account required** (primary escape hatch), or
- Use **Sign in** only if testing account-linked features (see demo account below).

Cold start never lands on `/login` — `AuthGate` redirects fresh installs to `/onboarding/tier-trial`.

## App Review Notes (paste into App Store Connect)

```
Ideal Solutions Pro — guest trial is the primary review path (no login required).

Steps (iPad or iPhone):
1. Fresh install → home cold splash (~6s) → legal intro → check all seven legal documents → tap "Accept all and continue".
2. Tier trial onboarding opens automatically → pick any plan → tap "Start free trial".
4. Full app unlocks locally for 7 days. No Apple ID purchase required for the trial.

Sign-in is OPTIONAL. Do not require login to evaluate core contractor features.

Optional signed-in test (cloud sync / company features only):
Email: appstore.review@idealsolutions.demo
Password: ReviewDemo1
On the sign-in screen, tap "Use App Store review demo" to pre-fill these credentials.
Demo login always works offline — no server required.

Privacy: We do not sell user data or share it with data brokers. App Privacy labels reflect in-app functionality, not cross-app advertising tracking.
```

## Demo account (optional — cloud sync / company features)

For flows that require a logged-in user (company invites, cloud profile sync, subscribe-with-account):

| Field | Value |
|-------|--------|
| Email | `appstore.review@idealsolutions.demo` |
| Password | `ReviewDemo1` |

**Store builds:** demo login works **offline on-device** (embedded App Review profile). No server required for sign-in during review.

**Cloud server (optional):** seed on pricing-backend for full cloud sync testing:

```bash
cd pricing-backend
npm run seed:app-review-demo
```

Requires the pricing-backend process and `data/app-auth.json` write access. Re-running is safe (skips if the account already exists).

## Production API URL (`EXPO_PUBLIC_PRICING_API_URL`)

EAS **production** builds currently ship **without** a public pricing/auth API URL. That is expected for core app review — guest trial and offline demo login do not need it.

When you deploy pricing-backend publicly, set the URL before rebuilding:

```bash
npx eas env:create --name EXPO_PUBLIC_PRICING_API_URL --value "https://YOUR_PUBLIC_HTTPS_API" --environment production --visibility plaintext
npx eas build --platform ios --profile production
```

Verify reachability:

```bash
curl -sS "https://YOUR_PUBLIC_HTTPS_API/health"
curl -sS -X POST "https://YOUR_PUBLIC_HTTPS_API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"appstore.review@idealsolutions.demo","password":"ReviewDemo1","persistSession":true}'
```

Preview/TestFlight placeholder values like `https://YOUR-PUBLIC-API-URL` are treated as **unconfigured** — the app uses local auth and the offline demo account instead of failing with raw network errors.

LAN/private URLs (`192.168.x.x`, `10.x`, `localhost`) in production store builds are also treated as offline — demo login still works without your dev PC running.

## iPad-specific notes

- Native iPad layout (not iPhone compatibility mode): `supportsTablet: true`, `UIRequiresFullScreen: false`.
- Auth and onboarding forms use a centered max width on iPad so controls stay tappable.
- Portrait and landscape orientations are supported on iPad.

## Environment flags (EAS / production)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SKIP_LEGAL_GATE=true` | **Local dev only** — skips launch legal modal. Must be **unset** for EAS production/preview builds. |
| `EXPO_PUBLIC_SUBSCRIPTIONS_DISABLED=true` | **Dev/TestFlight only** — bypasses paywalls. Must be **false** for store review builds. |
| `EXPO_PUBLIC_PRICING_API_URL` | **Optional for review** — public HTTPS pricing-backend root. Unset = guest trial + offline demo login. Set when cloud AI/auth/sync is deployed. |

Production App Store builds enforce the full legal gate (intro + seven documents including Analytics & Privacy Disclosure). Settings → Legal Stuff lists the same documents for read-only review. Guest trial remains available without login.

### No cross-app tracking

The app does not track users across third-party apps or websites. `NSUserTrackingUsageDescription` has been removed from the binary. Location is used only for app functionality.

**App Store Connect privacy labels:**

If rejection cited “privacy information indicates tracking,” open **App Privacy** and set **Used for tracking you** to **No** for data used only for in-app functionality (contacts picker, clock-in GPS, job photos, accounts, RevenueCat subscriptions, crash/performance). Apple “tracking” means linking data across **other companies’** apps/websites for advertising or sharing with data brokers — not first-party contractor tools.

| Data type | Typical purpose | Used for tracking? |
|-----------|-----------------|-------------------|
| Contacts | Pick customers | **No** |
| Precise Location | Clock-in verification | **No** |
| Photos or Videos | Job photos, logo | **No** |
| Email / User ID | Account, sync | **No** |
| Device ID | Trial anti-abuse, subscriptions | **No** |
| Product Interaction | RevenueCat subscriptions | **No** |
| Crash / Performance / Diagnostic | App stability | **No** |

## Troubleshooting reviewer “login required” reports

- Confirm build includes AuthGate redirect to `/onboarding/tier-trial` (not `/login`) on fresh install.
- Delete app and reinstall to clear prior trial/device state.
- Ensure Review Notes describe the guest trial path above.
- If reviewer tried demo credentials and saw an error: rebuild with the latest auth fixes (offline demo login + cloud-failure fallback + user-friendly errors).
- Wrong demo password shows a hint to use `ReviewDemo1` exactly (leading/trailing spaces are trimmed).

## Sign in with Apple

**Not used.** Ideal Solutions Pro uses **email + password** only (`app/(auth)/login.tsx`, `authApi.ts`). There is no `expo-apple-authentication` dependency and no Sign in with Apple button. Apple Guideline 4.8 does not require Apple sign-in when the app only offers a custom email/password account system and no third-party social login.

## Authentication audit (Guideline 2.1(a))

### Fresh install path (iPhone + iPad)

1. `LegalAcceptanceGate` — seven documents (via `SubscriptionContext` after legal session).
2. `AuthGate` — unauthenticated users redirect to `/onboarding/tier-trial` (never `/login` on cold start).
3. `TrialOnboardingGate` — `trialNeverStarted` redirects to tier picker; active trial skips `/upgrade` lock.
4. Tap **Start free trial** → `startProTrial` (local + optional Supabase stub) → home with full tier access.

Employee path: tier picker first (employee is not trial-exempt), then **Continue to invite code** → `/employee/join`.

### Auth failure paths (inventory)

| Location | Trigger | User-visible? | Trial-safe? |
|----------|---------|---------------|-------------|
| `app/(auth)/login.tsx:50-74` | Sign-in API/local failure | Inline text only (no `Alert`) | During active trial: optional-notice copy, not login error |
| `app/(auth)/signup.tsx:44-88` | Sign-up failure | Inline only | Same guest-trial policy |
| `app/(auth)/forgot-password.tsx:23-37` | Reset email / network | Inline status | Guest trial link shown |
| `lib/auth/AuthContext.tsx:96-101,117-118` | Uncaught sign-in/up | Mapped via `toUserFacingAuthError` | Returned to screens above |
| `lib/auth/authApi.ts:115-116,185,217,221` | Cloud/local auth API | Mapped errors | Demo login short-circuits first (`178-180`) |
| `lib/auth/userFacingAuthErrors.ts:39-107` | Raw fetch/HTTP errors | Guest trial hint appended | N/A (pre-trial login only) |
| `context/SubscriptionContext.tsx:307-480` | RevenueCat configure/read | `errorMessage` on subscribe/upgrade | Suppressed when guest trial active (`subscriptionErrorForGuestTrial`) |
| `context/SubscriptionContext.tsx:520-528` | RC `logIn` after sign-in | Non-blocking (swallowed) | N/A |
| `context/SubscriptionContext.tsx:527-528` | Trial link `account_used` | `errorMessage` | Signed-in users only |
| `app/upgrade.tsx:44-48` | Billing `errorMessage` | Inline warn | Hidden when `proTrial.isActive` |
| `app/settings/subscribe.tsx:357` | Billing `errorMessage` | Inline warn | Hidden when `proTrial.isActive` |
| `app/settings/subscribe.tsx:131-137` | Purchase without account | Inline card (no `Alert`) | Trial continues without account |
| `app/settings/index.tsx:28-38` | Sign out confirm | `Alert` (settings, not login failure) | Trial-aware copy when active |
| `app/invite/accept.tsx:66-93` | Invite join validation | `Alert` on invite path only | Public route; not cold-start |
| `app/employee/join.tsx:73-128` | Invite redeem / cloud | Inline errors | Guest trial preserved |
| `components/onboarding/PlanPickerScreen.tsx` | Purchase/trial errors | Inline only | Auth intent via `navigateToAuthScreen` |

No `Alert.alert` remains on login, signup, or forgot-password screens.

### Fixes in this audit

- **AuthGate** uses `SubscriptionContext.proTrial` (fixes post-trial-start redirect race on pathname change).
- **login/signup** use `authFailureCopyDuringGuestTrial` — no harsh login errors during active trial.
- **TrialOnboardingGate** never redirects to `/upgrade` while `proTrial.isActive`.
- **RevenueCat `logIn`** failures are non-blocking after sign-in.
- **subscribe / upgrade** hide billing errors during active guest trial.
- **subscribe / PlanPickerScreen** replace purchase-account `Alert` with inline prompts.
- **forgot-password** adds guest trial escape hatch.
- **settings sign-out** message clarifies guest trial continues.


## Resubmit after login fix

1. Confirm EAS production: `EXPO_PUBLIC_PRICING_API_URL` unset or public HTTPS only (not LAN).
2. `npx eas build --platform ios --profile production`
3. `npx eas submit --platform ios --profile production`
4. Paste Review Notes from the section above into App Store Connect.

## App Store Connect metadata (Guideline 3.1.2)

Complete these in **App Store Connect** before resubmitting build 60+:

### Paid Apps Agreement

- In App Store Connect → **Agreements, Tax, and Banking**, accept the **Paid Apps Agreement** if not already active.
- Without it, in-app purchases and subscriptions will not process in review.

### Privacy Policy URL (required)

- **App Privacy** section: set **Privacy Policy URL** to:
  `https://www.idealsolutionspro.com/legal/privacy-policy`
- In-app copy: **Settings → Legal Stuff → Privacy Policy** (`/settings/legal/privacy`).

### Terms of Use / EULA (required for subscriptions — Guideline 3.1.2)

Apple requires a functional EULA link in metadata **and** in the app immediately before the Subscribe button.

**Recommended — Custom EULA field:**

1. App Store Connect → your app → **App Information**.
2. Under **License Agreement**, choose **Custom App License Agreement (EULA)**.
3. Paste the same text as in-app **EULA / Software License Agreement** (`constants/legal/eula.ts`), **or** set the EULA URL to:
   `https://www.idealsolutionspro.com/legal/eula`

**Also add to App Description** (if not using custom EULA field):

```
Terms of Use (EULA): https://www.idealsolutionspro.com/legal/eula
Privacy Policy: https://www.idealsolutionspro.com/legal/privacy-policy
```

Optional reference to Apple’s standard EULA (does not replace your custom EULA when you use a custom license):
`https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`

The in-app subscribe screen (`Settings → Subscription`) shows subscription title, length, price, App Store free-trial terms when configured in RevenueCat, auto-renewal disclosure, and links to `/settings/legal/terms`, `/settings/legal/eula`, and `/settings/legal/privacy` (long-press opens the HTTPS copies above).

### Subscription products in App Store Connect

Confirm each auto-renewable subscription has:

| Field | Example (Boss Man monthly) |
|-------|----------------------------|
| Reference name | Ideal Solutions Pro Monthly |
| Product ID | `boss_man_monthly` |
| Duration | 1 month |
| Price | $19.99 |
| Localization display name | Boss Man (Ideal Solutions Pro) |

Repeat for tier SKUs (`side_hustle_monthly`, `boss_man_monthly`, `super_boss_man_monthly`, `enterprise_boss_man_monthly`).

### Sandbox testing for reviewers (iPad Air 11-inch)

**Guest trial (no IAP — primary path):**

1. Fresh install → legal gate → tier picker → **Start free trial**.
2. No Apple ID purchase is required; trial is device-local for 7 days.
3. Home should appear within ~1s (spinner only while local save runs). If it hangs >10s, an error appears — reinstall and retry.

**Store subscription (IAP — Settings → Subscription):**

1. After trial or from **Settings → Subscription**, pick a paid plan.
2. Confirm disclosure shows plan name, length, price, auto-renewal text, and EULA/Privacy links.
3. Tap **Subscribe** — StoreKit sandbox sheet appears (RevenueCat sandbox).
4. Use a **Sandbox Apple ID** (Users and Access → Sandbox → Testers).
5. Test **cancel** on the sheet, **Restore purchases**, and **Open App Store subscriptions** on iPad.

Reviewers can evaluate core features via guest trial alone; subscription IAP is optional.

## iPad free-trial regression (build 60+ fix)

If **Start free trial** appeared unresponsive on iPad:

- Guest trial no longer waits on RevenueCat — local trial applies immediately, then navigates home.
- `startProTrial` and IAP actions time out after 8–10s with a user-visible error (never stuck on spinner).
- RevenueCat `getOfferings()` / `getCustomerInfo()` time out (10s / 8s) so Subscribe cannot hang forever.
- iPad CTA uses 64px min height, extra hitSlop, and `zIndex` so the button is not under scroll content.
- `applyGuestTrialState` runs before navigation so gates do not redirect back to the tier picker.

Test on **iPad Air 11-inch** simulator or device: tap **Start free trial** → home within ~1s.


## Login error messages (what reviewers see)

All login failures are **inline text** on the sign-in screen — no pop-up alerts.

| Situation | Message |
|-----------|---------|
| Empty email | Enter a valid email address. (field error) |
| Empty password | Enter your password. (field error) |
| Wrong demo password | Incorrect password for the App Store review account… + guest trial hint |
| Demo creds (any build) | Signs in offline instantly via "Use App Store review demo" or manual entry — no error |
| Active guest trial + wrong password | Optional-notice copy only — not a login error |
| Wrong email (local mode) | No account found on this device… + guest trial hint |
| Cloud API unreachable | Could not reach the account server… + guest trial hint |
| Cloud API not configured | Sign-in is optional… + offline demo works |
| Raw HTTP / JSON failures | Mapped to plain English; never shows stack traces or `Request failed (502)` alone |
