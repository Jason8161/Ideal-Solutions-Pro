# Workspace schema (boss / employee)

PostgreSQL definitions live in `src/db/schema.ts` (`WORKSPACE_SQL`). JSON file fallback: `src/workspace/jsonStore.ts`.

## Core tables

| Table | Purpose |
|-------|---------|
| `companies` | Contractor workspace (boss device + token) |
| `roles` | `boss` (legacy), `contractor`, `admin`, `employee` |
| `users` | Workspace members (`role_id` → `roles`) |
| `employees` | Crew records linked to optional `user_id` after invite redeem |
| `invites` | Codes for employee app onboarding |
| `jobs` / `job_assignments` | Assigned work |
| `messages` | Team / job channels |
| `schedules` | Shift rows (Phase 2 UI) |
| `time_clock_entries` | Aggregated punches (GPS events in `clock_verification_events`) |
| `photos` | Job photos metadata |
| `notifications` / `push_tokens` | Alerts |

## API (pricing-backend)

- `POST /api/workspace/company` — boss registration
- `POST /api/workspace/invites` — boss creates invite (Bearer boss token)
- `POST /api/workspace/invites/redeem` — employee joins
- `GET /api/workspace/assignments`, `/messages`, …

## App role mapping

Mobile `AppRole`: `admin` | `contractor` | `employee`. Cloud `roleId`: `boss` | `employee`. Boss maps to `contractor` until multi-admin UI ships.
