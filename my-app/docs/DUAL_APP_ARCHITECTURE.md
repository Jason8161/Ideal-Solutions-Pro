# Dual app architecture (Pro + Employee)

One Expo codebase (`my-app/`), one backend (`pricing-backend/`), two store listings via **app variant** and/or **workspace role**.

## Roles

| App role | Cloud `roleId` | Home route |
|----------|----------------|------------|
| `contractor` | `boss` | `/` (Ideal Solutions Pro) |
| `admin` | `boss` (future) | `/` |
| `employee` | `employee` | `/employee` |

Persistence:

- `ideal_workspace_role_v1` — last resolved role
- `ideal_employee_session_v1` — employee cloud session (invite redeem or dev toggle)

## Routing (Phase 1)

- `lib/auth/roleRouteGuard.tsx` — wraps root layout (exported as `EmployeeRouteGuard`)
- Employees blocked from boss paths via `lib/permissions/roleAccess.ts`
- Contractors blocked from `/employee` unless employee session active (dev toggle in Settings → Employee AI)
- `APP_VARIANT=employee` forces employee home even before login

## Feature gates

```ts
import { canAccess } from "@/lib/permissions/roleAccess";
await canAccess("employee_clock");
```

## Employee shell

- Dashboard: `app/employee/index.tsx` + `lib/employeeMenuItems.ts`
- GPS clock: `app/employee/clock.tsx` (clockVerification)
- Join: `app/employee/join.tsx`
- Boss invite: `app/job-folder/crew/invite.tsx` (+ cloud API when configured)

## Build: Employee variant

### Local dev

```bash
cd my-app
npm run start:employee
```

Or: `APP_VARIANT=employee npx expo start`

### EAS

```bash
npm run eas:build:employee-ios
npm run eas:build:employee-android
```

Profiles: `employee-ios`, `employee-android` in `eas.json`.

Config:

- `app.config.js` reads `APP_VARIANT` / `EXPO_PUBLIC_APP_VARIANT`
- Stub: `app.config.employee.js` (sets variant env, re-exports main config)

Employee bundle IDs:

- iOS: `com.idealsolutions.employee`
- Android: `com.idealsolutions.employee`

Optional icon: `assets/images/icon-employee.png` (falls back to Pro icon if missing).

Env for invites:

- `EXPO_PUBLIC_PRICING_API_URL` — workspace API
- `EXPO_PUBLIC_EMPLOYEE_APP_IOS_URL` / `EXPO_PUBLIC_EMPLOYEE_APP_ANDROID_URL` — store links in SMS/email

## Phase 2 (not in this foundation)

- Full schedule sync UI for employees
- Time-off requests + approvals
- Daily notes sync to job folder
- Tasks board per assignment
- Admin vs contractor permission split on cloud
- Separate EAS project / ASC listing polish (screenshots, employee-only onboarding)
- Push notification routing by role

See also: `docs/EMPLOYEE_BOSS_CLOUD.md`, `pricing-backend/docs/WORKSPACE_SCHEMA.md`.
