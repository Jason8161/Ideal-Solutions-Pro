import type { EmployeePermissions } from "@/lib/cloud/types";
import { resolveCurrentAppRole } from "@/lib/auth/sessionRole";
import { isBossAppRole, isEmployeeAppRole, type AppRole } from "@/lib/auth/roles";
import { loadEmployeeSession } from "@/lib/employeeSession";

/** Feature keys for role-based gating (Phase 1). */
export type AppFeature =
  | "home_boss"
  | "job_folder_admin"
  | "settings_financial"
  | "subscriptions"
  | "getting_paid"
  | "estimates_admin"
  | "invoices_admin"
  | "crew_admin"
  | "employee_dashboard"
  | "employee_clock"
  | "employee_schedule"
  | "employee_messages"
  | "employee_jobs"
  | "employee_photos"
  | "employee_tasks"
  | "employee_ai"
  | "employee_profile"
  | "employee_time_off"
  | "employee_material_request"
  | "employee_daily_notes";

const EMPLOYEE_FEATURES: AppFeature[] = [
  "employee_dashboard",
  "employee_clock",
  "employee_schedule",
  "employee_messages",
  "employee_jobs",
  "employee_photos",
  "employee_tasks",
  "employee_ai",
  "employee_profile",
  "employee_time_off",
  "employee_material_request",
  "employee_daily_notes",
];

const BOSS_ONLY_FEATURES: AppFeature[] = [
  "home_boss",
  "job_folder_admin",
  "settings_financial",
  "subscriptions",
  "getting_paid",
  "estimates_admin",
  "invoices_admin",
  "crew_admin",
];

const PERMISSION_KEY_BY_FEATURE: Partial<Record<AppFeature, keyof EmployeePermissions>> = {
  settings_financial: "company_financials",
  estimates_admin: "estimates",
  invoices_admin: "invoices",
  subscriptions: "billing",
  getting_paid: "billing",
};

function permissionGranted(
  permissions: EmployeePermissions | undefined,
  key: keyof EmployeePermissions,
): boolean {
  return permissions?.[key] === true;
}

/** Synchronous gate when role is already known. */
export function canAccessForRole(
  feature: AppFeature,
  role: AppRole,
  permissions?: EmployeePermissions,
): boolean {
  if (isBossAppRole(role)) {
    if (EMPLOYEE_FEATURES.includes(feature) && feature === "employee_dashboard") {
      return false;
    }
    return !EMPLOYEE_FEATURES.includes(feature) || feature === "employee_ai";
  }

  if (!isEmployeeAppRole(role)) return false;

  if (BOSS_ONLY_FEATURES.includes(feature)) {
    const key = PERMISSION_KEY_BY_FEATURE[feature];
    if (key && permissionGranted(permissions, key)) return true;
    return false;
  }

  if (EMPLOYEE_FEATURES.includes(feature)) return true;
  return false;
}

/** Resolves session role + cloud permission overrides. */
export async function canAccess(feature: AppFeature): Promise<boolean> {
  const role = await resolveCurrentAppRole();
  const session = await loadEmployeeSession();
  return canAccessForRole(feature, role, session.permissions);
}

/** Paths employees may open (assigned jobs, clock, limited settings). */
export const EMPLOYEE_ALLOWED_PATH_PREFIXES = [
  "/employee",
  "/job-folder/current-jobs",
  "/job-folder/job-photos",
  "/job-folder/schedule",
  "/settings/user-info",
] as const;

/** Boss-only routes (financial, subscriptions, full job folder hub). */
export const BOSS_BLOCKED_PATH_PREFIXES_FOR_EMPLOYEE = [
  "/",
  "/settings/subscribe",
  "/settings/accounting",
  "/settings/accounting-billing",
  "/settings/invoice-customization",
  "/settings/invoice-payments",
  "/settings/payment-apps",
  "/settings/employees",
  "/settings/my-crew",
  "/settings/employee-ai",
  "/settings/backup",
  "/settings/backup-restore",
  "/settings/integrations",
  "/getting-paid",
  "/estimates",
  "/subscribe",
  "/misc-apps",
  "/materials-search",
  "/ai-assistance",
  "/job-folder/boss-man",
  "/job-folder/estimates",
  "/job-folder/invoices",
  "/job-folder/crew",
  "/job-folder/hub",
  "/job-folder/new",
  "/job-folder/time-payroll",
  "/job-folder/reports",
  "/job-folder/customers",
  "/job-folder/completed-jobs",
] as const;

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  const p = pathname.toLowerCase();
  const pre = prefix.toLowerCase();
  return p === pre || p.startsWith(`${pre}/`);
}

export function isPathAllowedForEmployee(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (EMPLOYEE_ALLOWED_PATH_PREFIXES.some((prefix) => pathMatchesPrefix(p, prefix))) {
    return true;
  }
  if (p.startsWith("/job-folder/job/")) return true;
  return false;
}

export function isPathBlockedForRole(pathname: string, role: AppRole): boolean {
  if (!isEmployeeAppRole(role)) {
    return false;
  }
  const p = pathname.toLowerCase();
  if (p === "/employee" || p.startsWith("/employee/")) return false;
  if (isPathAllowedForEmployee(pathname)) return false;
  if (BOSS_BLOCKED_PATH_PREFIXES_FOR_EMPLOYEE.some((prefix) => pathMatchesPrefix(p, prefix))) {
    return true;
  }
  if (p.startsWith("/job-folder")) return true;
  if (p.startsWith("/settings")) return true;
  return false;
}

export async function isPathBlockedForCurrentRole(pathname: string): Promise<boolean> {
  const role = await resolveCurrentAppRole();
  return isPathBlockedForRole(pathname, role);
}
