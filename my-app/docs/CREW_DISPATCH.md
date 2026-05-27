# Crew & Dispatch — Architecture

Job Folder hub for boss-side employee operations. Complements **Settings → My crew** (payroll roster, contacts import) without replacing it.

## Routes

| Route | Purpose |
|-------|---------|
| `/job-folder/crew` | Dashboard — stats, activity feed, hub links |
| `/job-folder/crew/list` | Searchable employee list with dispatch actions |
| `/job-folder/crew/dispatch` | Dispatch board (Available / Assigned / Emergency / Completed) |
| `/job-folder/crew/invite` | QR + deep link + SMS/email invite workflow |
| `/job-folder/crew/employees/[id]` | Employee profile (personal, work, app access, assigned jobs) |
| `/job-folder/crew/coming-soon?feature=` | Future feature placeholders |

**Boss Man tile:** `Crew & Dispatch` (`crew-dispatch` key) on `/job-folder/boss-man`. Pro-gated like Schedule and Time & Payroll.

## Data layer

```
lib/employees/          — canonical employee records (AsyncStorage)
lib/employees/types.ts  — Employee, roles, dispatch status labels
lib/employees/permissions.ts — boss vs technician UI gates
lib/crew/
  activityLog.ts        — local recent-activity feed
  dispatchStorage.ts    — emergency flags + local notification stubs
  dispatchStatus.ts     — derive Available/Assigned/Off Duty/Emergency
  dashboardStats.ts     — dashboard counters
  inviteCodes.ts        — per-employee invite codes + deep links
  futureFeatures.ts     — coming-soon navigation targets
lib/bossMan/scheduling/scheduleStorage.ts — assignments (shared with Schedule)
lib/bossMan/scheduling/dispatchShare.ts   — SMS/email dispatch messages
lib/employeeAppInvite.ts                  — employee app install invites
```

Storage keys are versioned (`*_v1`) and include optional `cloudEmployeeId` / `assignmentId` fields for future sync.

## Schedule integration

- **Schedule / Dispatch** (`/job-folder/schedule`) remains the calendar-centric view: 4-week lookahead, per-day availability, conflict checks.
- **Crew hub** focuses on ops: roster cards, tap-to-dispatch, board columns, profiles, invites.
- Both read/write **`scheduleStorage`** assignments and **`employeeStorage`** roster.
- Dispatch from crew creates assignments via `upsertScheduleAssignment`, then sends through `dispatchShare` (same as schedule modal).
- Employee profiles list assignments from `loadScheduleAssignments` plus boss jobs from `jobStorage`.

## MVP vs placeholder

| Feature | Status |
|---------|--------|
| Dashboard stats & activity feed | MVP (local data) |
| Employee list, search, filters, profile | MVP |
| Dispatch board (tap-to-assign) | MVP |
| Dispatch modal (job, notes, materials, priority, maps) | MVP |
| SMS/email dispatch + local notification stub | MVP |
| Invite QR / share link / text / email | MVP |
| Roles + `permissions.ts` gates | MVP (technician self-view filter) |
| Settings → My crew | Unchanged |
| Drag-and-drop board | Placeholder (gesture handler present; tap assign for now) |
| GPS, payroll, timesheets, fleet, tools, safety, AI scheduling, ETA | Placeholder → `coming-soon` |
| Cloud invite API (`pricing-backend`) | Optional — local codes + `employeeAppInvite` for now |
| `lastLoginAt` / push delivery | Stub fields |

## Permissions

- Boss routes use `{ isBoss: true }` in list filtering.
- `filterEmployeesForViewer` limits technician employee sessions to self when wired through employee mode.
- Extended fields editable via shared `EmployeeForm` (also used in Settings).

## Theming

Screens use `useBossManChrome`, `ScStickyScroll`, transparent nav rows, and `AppConstructionBackdrop` on modals — consistent with Job Folder / Boss Man.
