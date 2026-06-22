export const COMPANY_ROLE_IDS = [
  "owner",
  "admin",
  "employee",
  "superintendent",
  "check_guy",
] as const;

export type CompanyRoleId = (typeof COMPANY_ROLE_IDS)[number];

export type PermissionKey =
  | "all"
  | "subscription"
  | "user_management"
  | "employees"
  | "estimates"
  | "invoices"
  | "verify_phases"
  | "draw_approvals"
  | "phase_approvals"
  | "assigned_jobs"
  | "time_clock"
  | "job_photos"
  | "crew_chat"
  | "schedule"
  | "messages"
  | "tasks"
  | "material_requests"
  | "daily_notes";

type RolePermissions = Partial<Record<PermissionKey, boolean>>;

const ROLE_PERMISSIONS: Record<CompanyRoleId, RolePermissions> = {
  owner: { all: true, subscription: true },
  admin: { all: true },
  employee: {
    assigned_jobs: true,
    schedule: true,
    messages: true,
    time_clock: true,
    job_photos: true,
    tasks: true,
    material_requests: true,
    daily_notes: true,
    crew_chat: true,
  },
  superintendent: {
    verify_phases: true,
    phase_approvals: true,
  },
  check_guy: {
    draw_approvals: true,
  },
};

export function isCompanyRoleId(value: string): value is CompanyRoleId {
  return (COMPANY_ROLE_IDS as readonly string[]).includes(value);
}

export function hasCompanyPermission(roleId: CompanyRoleId, key: PermissionKey): boolean {
  const perms = ROLE_PERMISSIONS[roleId];
  if (perms.all) {
    if (key === "subscription") return roleId === "owner";
    return true;
  }
  return perms[key] === true;
}

/** Only the company owner may manage App Store / Play billing. */
export function canManageSubscription(roleId: CompanyRoleId): boolean {
  return roleId === "owner";
}
