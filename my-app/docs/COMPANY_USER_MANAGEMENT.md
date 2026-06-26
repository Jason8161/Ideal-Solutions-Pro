# Company User Management ΓÇö Implementation Plan

Ideal Solutions Pro multi-role company accounts. This document describes what shipped in the **foundation pass** and what remains for later phases.

## Architecture overview

```
Owner registers (email/password)
    ΓåÆ pricing-backend creates app account + company_accounts row + owner membership
    ΓåÆ profile includes companyId + roleId

Owner/Admin invites by email + role
    ΓåÆ company_invites row + optional deep link (/invite/accept?code=ΓÇª)
    ΓåÆ invitee sets password ΓåÆ account + membership

All API data scoped by company_id; subscription tier on company drives user seat limits.
```

### Role permissions

| Role | Access |
|------|--------|
| **Owner** | Full access, subscription, user CRUD, all company data |
| **Admin** | Employees, schedules, jobs, service calls, invoices, estimates, user invites ΓÇö no subscription ownership |
| **Employee** | Assigned jobs, schedule, clock in/out, photos/notes, crew chat ΓÇö no billing |
| **Superintendent** | Assigned projects, verify phases, approve/reject phase completion, inspection notes/photos |
| **Check Guy** | Phase-complete notifications, review superintendent approvals, verify work, approve/deny draw releases, approval history |

### Subscription user limits

| Tier ID | Max users (incl. owner) |
|---------|-------------------------|
| `side_hustle` | 1 |
| `boss_man` | 1 |
| `super_boss_man` | 8 |
| `enterprise_boss_man` | 15 |

Enforced in `pricing-backend/src/company/store.ts` on invite create and invite accept.

---

## Schema (Phase 0 ΓÇö implemented)

### Postgres (`pricing-backend/src/db/schema.ts` ΓåÆ `COMPANY_USER_SQL`)

| Table | Purpose |
|-------|---------|
| `company_accounts` | Company workspace; `owner_user_id`, `subscription_tier` |
| `company_members` | User Γåö company Γåö `role_id` + `status` |
| `company_invites` | Email invites with role, code, expiry |
| `audit_events` | Timestamped actions with `user_id`, `company_id`, metadata |
| `roles` (extended) | Adds `owner`, `superintendent`, `check_guy` |

### JSON fallback (no Postgres)

- `data/company-users.json` ΓÇö companies, members, invites, audit events
- `data/app-auth.json` ΓÇö email/password accounts (existing)

### Supabase

- `my-app/supabase/migrations/004_company_user_management.sql` ΓÇö mirror of PG tables for when Supabase is primary DB

---

## API routes (Phase 0 ΓÇö implemented)

Base URL: `EXPO_PUBLIC_PRICING_API_URL` (pricing-backend).

### Auth (extended)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | Creates company + owner membership |
| POST | `/api/auth/login` | Returns `profile.companyId`, `profile.roleId`; writes audit `login` |

### Company users

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/company/roles` | ΓÇö | Role enum for UI |
| GET | `/api/company/me` | Bearer | Current user + company |
| GET | `/api/company/users` | Bearer | List members |
| POST | `/api/company/invites` | Owner/Admin | Seat limit check |
| GET | `/api/company/invites` | Owner/Admin | Pending/history |
| GET | `/api/company/invites/preview?code=` | ΓÇö | Public invite preview |
| POST | `/api/company/invites/accept` | ΓÇö | Set password + join |
| PATCH | `/api/company/users/:userId/role` | Owner/Admin | Change role |
| PATCH | `/api/company/users/:userId/status` | Owner/Admin | Enable/disable |
| GET | `/api/company/audit` | Bearer | Audit trail |
| POST | `/api/company/audit` | Bearer | Client-side event ingest |

Legacy workspace routes (`/api/workspace/*`) remain for device-token employee flows.

---

## Mobile app (Phase 0 ΓÇö implemented)

| Area | Location |
|------|----------|
| Permissions model | `lib/permissions/companyRoles.ts`, `userLimits.ts`, `roleAccess.ts` |
| API client | `lib/company/companyUserApi.ts` |
| Audit helper | `lib/company/auditLog.ts` |
| Profile fields | `companyId`, `roleId` on `UserProfile` |
| Role routing | `lib/auth/routing.ts`, `sessionRole.ts`, `roleRouteGuard.tsx` |
| Dashboards (skeleton) | `/superintendent`, `/check-guy`, `/employee` (existing) |
| User management UI | Settings ΓåÆ **Company users** (`/settings/company-users`) |
| Invite accept | `/invite/accept?code=ΓÇª` |

---

## Implemented vs phased

### Γ£à Foundation (this pass)

- [x] DB schema + migrations (PG + Supabase SQL)
- [x] Company create on owner register
- [x] Five-role permission matrix (backend + app)
- [x] Invite create / preview / accept with password
- [x] Subscription tier seat limits on invite
- [x] User list, role change, disable/enable
- [x] Audit log table + login audit + client POST helper
- [x] Role-based dashboard routing skeleton
- [x] Owner/Admin company users settings screen

### ≡ƒö▓ Phase 1 ΓÇö Auth & billing integration

- [ ] Sync `company_accounts.subscription_tier` from RevenueCat webhooks / app
- [ ] Password reset email delivery (`/api/auth/forgot-password`)
- [ ] Migrate legacy `app-auth.json` accounts without `companyId` on first login
- [ ] Unify legacy `/api/workspace/invites` with `/api/company/invites`
- [ ] Owner transfer / delete company

### ≡ƒö▓ Phase 2 ΓÇö Field workflows

- [ ] Wire clock in/out to audit (`clock_in`, `clock_out`) in `clockEventRoutes`
- [ ] Job update audit from job sync layer
- [ ] Superintendent phase approval UI + API
- [ ] Check Guy draw approval UI + push notifications
- [ ] Assign jobs/projects by role

### ≡ƒö▓ Phase 3 ΓÇö Hardening

- [ ] Postgres RLS / Supabase Auth policies
- [ ] Email invite delivery (SMTP/Resend)
- [ ] Rate limits on invite accept
- [ ] Admin audit export
- [ ] E2E tests for invite + seat limits

---

## Local testing

### 1. Start pricing-backend

```powershell
cd "C:\Users\trace\OneDrive\Ideal Solutions\Ideal Solutions\pricing-backend"
npm install
npm run dev
```

With Docker (optional Postgres):

```powershell
npm run setup:local
npm run dev
```

Without Postgres, company data uses `data/company-users.json`.

### 2. Configure my-app

In `my-app/.env`:

```
EXPO_PUBLIC_PRICING_API_URL=http://<LAN-IP>:3001
# Optional for TestFlight/production HTTPS invite links (defaults to Metro origin in dev):
# EXPO_PUBLIC_APP_DEEP_LINK_BASE=https://app.yourdomain.com
```

Restart Expo after changing env.

### 3. Owner flow

1. Sign up at `/signup` ΓÇö creates owner + company.
2. Open **Settings ΓåÆ Company users**.
3. Invite `teammate@example.com` as Employee ΓÇö note code/link.
4. Open `/invite/accept?code=XXXX` (or use link) ΓÇö set password.
5. Sign in as invitee ΓÇö should land on `/employee` (or role dashboard).

### 4. API smoke tests

```powershell
# Register
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"owner@test.com\",\"password\":\"Test1234\",\"fullName\":\"Owner\",\"companyName\":\"Test Co\",\"persistSession\":true}"

# Login (save token)
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"owner@test.com\",\"password\":\"Test1234\",\"persistSession\":true}"

# List users (replace TOKEN)
curl http://localhost:3001/api/company/users -H "Authorization: Bearer TOKEN"
```

### 5. Verify builds

```powershell
cd pricing-backend; npm run build
cd ..\my-app; npx tsc --noEmit
```

---

## Files touched (foundation)

**pricing-backend:** `src/db/schema.ts`, `src/db/runMigrate.ts`, `src/index.ts`, `src/auth/*`, `src/company/*`, `src/routes/companyUserRoutes.ts`, `src/routes/authRoutes.ts`

**my-app:** `lib/permissions/*`, `lib/company/*`, `lib/auth/*`, `app/superintendent/*`, `app/check-guy/*`, `app/invite/accept.tsx`, `app/settings/company-users.tsx`, `supabase/migrations/004_company_user_management.sql`, `lib/settingsGroups.ts`
