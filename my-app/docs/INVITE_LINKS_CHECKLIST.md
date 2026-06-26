# Invite links verification checklist

Use this before every **EAS production iOS** build when crew/employee invites matter.

## Quick pre-build command

```bash
node ./scripts/check-invite-messages.mjs
npx expo export --platform ios
```

Both must pass with no errors.

## Verification matrix

| Path | UI entry | Message builder | iOS store URL | Join/accept URL | Safe for build |
|------|----------|-----------------|---------------|-----------------|----------------|
| Settings ΓåÆ Company users | `app/settings/company-users.tsx` | `createCompanyInvite` ΓåÆ `buildCompanyInviteAcceptUrl` | N/A (web accept link only) | Always returns server link, HTTPS base, or `ideal-solutions://` deep link | **YES** |
| Settings ΓåÆ My crew ΓåÆ Employees ΓåÆ Invite | `components/employees/EmployeeForm.tsx` ΓåÆ `showEmployeeAppInviteMenu` | `lib/employeeAppInvite.ts` | `resolveEmployeeAppStoreLinks` ΓåÆ fallback `apps.apple.com/app/id6771799454` or TestFlight env | `resolveInviteExtras` ΓåÆ `buildEmployeeJoinUrl` / deep link | **YES** |
| Settings ΓåÆ My crew ΓåÆ Cloud crew invites | `components/cloud/CrewCloudInvites.tsx` | `buildEmployeeAppInviteMessage` | Same fallbacks via `loadEmployeeInviteContext` | Cloud API link or `buildEmployeeJoinUrl` | **YES** |
| Job folder ΓåÆ Crew invite | `app/job-folder/crew/invite.tsx` | SMS/email/share via `employeeAppInvite` | Same fallbacks | Local `buildEmployeeInviteDeepLink` + optional cloud link | **YES** |
| Job folder ΓåÆ Employee detail ΓåÆ Send app invite | `app/job-folder/crew/employees/[id].tsx` | `showEmployeeAppInviteMenu` | Same fallbacks | `employeeId` ΓåÆ invite code + join URL | **YES** |
| Alert / Share / SMS builders | `openEmployeeAppInviteSms`, `openEmployeeAppInviteEmail`, `shareEmployeeAppInvite` | `buildEmployeeAppInviteMessage` | `ensureStoreLinks` guarantees URLs even if caller passes empty links | Extras from `resolveInviteExtras` | **YES** |

## Forbidden copy (must never ship)

These phrases were removed from invite flows. The check script fails if they reappear:

- `download links are not set up`
- `download links not set up`
- `Download links are not set up`

## Fallback behavior (one-app model)

1. **iOS install URL** ΓÇö `EXPO_PUBLIC_IOS_TESTFLIGHT_URL` ΓåÆ `EXPO_PUBLIC_EMPLOYEE_APP_IOS_URL` / `EXPO_PUBLIC_PRO_IOS_STORE_URL` ΓåÆ hardcoded App Store id **6771799454** (`eas.json` submit.production.ios.ascAppId).
2. **Android install URL** ΓÇö env package vars ΓåÆ `com.idealsolutions.app` Play Store URL.
3. **Company invite accept** ΓÇö server `inviteLink` ΓåÆ `EXPO_PUBLIC_APP_DEEP_LINK_BASE` + `/invite/accept?code=` ΓåÆ `ideal-solutions://` deep link.
4. **Employee join** ΓÇö server link ΓåÆ base URL + `/employee/join?code=` ΓåÆ `ideal-solutions://` deep link.

## Manual smoke test (TestFlight build)

1. Settings ΓåÆ My crew ΓåÆ add employee ΓåÆ **Invite to employee app** ΓåÆ Send by text ΓÇö message includes App Store/TestFlight line and invite code.
2. Job folder ΓåÆ Crew ΓåÆ Invite ΓÇö QR/link works; Share invite includes store URL.
3. Settings ΓåÆ Company users ΓåÆ Send invite ΓÇö alert shows shareable HTTPS or deep link + code.
4. Confirm **no** ΓÇ£download links not set upΓÇ¥ anywhere.

## Related env vars (optional)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_IOS_TESTFLIGHT_URL` | TestFlight public link (preferred during beta) |
| `EXPO_PUBLIC_EMPLOYEE_APP_IOS_URL` | Override iOS store URL |
| `EXPO_PUBLIC_APP_DEEP_LINK_BASE` | HTTPS landing for invite accept/join links |
| `EXPO_PUBLIC_PRICING_API_URL` | Cloud company/workspace invites (not required for local crew invites) |
