# Backup & Restore — Ideal Solutions Pro

Mandatory backup/restore for on-device data before app updates and when moving to a new phone.

## Settings screen

**Path:** Settings → Data & backup → **Backup & restore**  
**Route:** `/settings/backup-restore`

### Primary actions

| Action | What it does |
|--------|----------------|
| **Save backup to device** | Creates a `.idealbackup.zip` file, then opens the system save/share sheet so you can store it in Files, Downloads, OneDrive, or email — outside the app sandbox. |
| **Restore from file on device** | Opens the document picker to choose a `.idealbackup.zip` (or legacy JSON) from Files/Downloads/cloud, then runs the restore flow. |
| **Save copy in app only** | Keeps a backup inside app storage (`{documentDirectory}/backups/`). Convenient but may be lost on uninstall. |

After restore, fully close and reopen the app.

## Backup file format

| Property | Value |
|----------|--------|
| Extension | `.idealbackup.zip` |
| Format version | `2` (ZIP bundle with `backup.json` + `assets/`) |
| Legacy support | `.json` exports (format version `1`) still restore |

Files are stored locally under:

```
{documentDirectory}/backups/
```

Filename pattern: `ideal-solutions-backup-{timestamp}.idealbackup.zip`

## Pre-update warning

On first launch after the app version increases (compared to stored `lastSeenAppVersion`), a full-screen modal appears **after legal acceptance** and **before the home screen**.

Actions:

- **Back up now** — creates a ZIP backup, opens the share sheet, then acknowledges the update
- **Continue without backup** — requires checkbox acknowledgment, then proceeds
- **Cancel update** — dismisses the modal (in-app update flow blocked until next launch; store updates are unaffected)

## Restore prompt

On first install (no significant local data), a **Restore previous backup?** prompt offers **Restore** or **Skip**.

Restore flow:

1. Pick file via document picker (ZIP or legacy JSON)
2. Validate schema / app id / format version
3. Create checkpoint ZIP in `backups/checkpoints/` before overwriting
4. Progress indicator during extract + AsyncStorage restore
5. Confirmation required before overwrite

After restore, fully close and reopen the app.

## Architecture (`lib/backup/`)

| Module | Role |
|--------|------|
| `types.ts` | Backup bundle types, cloud provider interface |
| `constants.ts` | Keys, paths, format version |
| `collectAllAppData.ts` | Gather AsyncStorage + referenced image files |
| `exportBackup.ts` | Build ZIP, write to `backups/` |
| `shareBackup.ts` | Export + OS save/share sheet for device storage |
| `importBackup.ts` | Validate, checkpoint, extract assets, restore |
| `validateBackup.ts` | JSON schema validation (v1 + v2) |
| `checkpointStorage.ts` | Pre-restore snapshot |
| `appVersionStorage.ts` | `lastSeenAppVersion`, update ack, restore prompt |
| `backupMetaStorage.ts` | Latest backup timestamp for settings UI |
| `cloudProvider.ts` | `BackupCloudProvider` stub (phase 2) |

## MVP data included

All keys matching `ideal_solutions_*` plus `distributorPortalUrl`, including:

- **Profile** — company profile and related prefs
- **Boss jobs** — job folders, phases, time entries, scheduling
- **Estimates** — Boss Man estimates and accounting/service-call estimates
- **Employees** — roster and crew
- **Invoices** — boss invoices, customization, payment settings
- **Calendar** — appointments and schedule data
- **AI projects** — AI assistance project history
- **Settings** — display, suppliers, payment apps, subscription prefs, legal acceptances
- **Material lists** — saved lists and material list state
- **Service calls** — service call records
- **Photos & images** — on-device files referenced in storage (button images, home tile overrides, company logos)

## Phase 2 (not in MVP)

- Encryption at rest for backup archives
- Cloud upload via `BackupCloudProvider` (iCloud / OneDrive / Ideal cloud)

## Legacy

`lib/phoneBackup.ts` re-exports the new module for older imports. The previous settings screen at `/settings/backup` remains but settings navigation points to `/settings/backup-restore`.
