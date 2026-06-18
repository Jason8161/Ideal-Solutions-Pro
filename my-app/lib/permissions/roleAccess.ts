import type { EmployeePermissions } from "@/lib/cloud/types";
import {
  canAccessRoute,
  canPerform,
  isEmployeeAllowedRoute,
  isRouteBlockedForWorkspace,
  resolveWorkspaceRole,
  type EmployeeAction,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { resolveCurrentAppRole, resolveCurrentCompanyRole } from "@/lib/auth/sessionRole";
import { isBossAppRole, isEmployeeAppRole, type AppRole } from "@/lib/auth/roles";
import { loadEmployeeSession } from "@/lib/employeeSession";
import type { CompanyRoleId } from "@/lib/permissions/companyRoles";
import { canManageSubscription, hasCompanyPermission, type PermissionKey } from "@/lib/permissions/companyRoles";

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
  | "company_user_management"
  | "superintendent_dashboard"
  | "check_guy_dashboard"
  | "phase_approvals"
  | "draw_approvals"
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

const COMPANY_FEATURE_MAP: Partial<Record<AppFeature, PermissionKey>> = {
  subscriptions: "subscription",
  company_user_management: "user_management",
  crew_admin: "employees",
  estimates_admin: "estimates",
  invoices_admin: "invoices",
  settings_financial: "invoices",
  superintendent_dashboard: "verify_phases",
  check_guy_dashboard: "draw_approvals",
  phase_approvals: "phase_approvals",
  draw_approvals: "draw_approvals",
  employee_clock: "time_clock",
  employee_jobs: "assigned_jobs",
  employee_photos: "job_photos",
  employee_messages: "crew_chat",
};

/** Synchronous gate when role is already known. */
export function canAccessForCompanyRole(feature: AppFeature, roleId: CompanyRoleId): boolean {
  const key = COMPANY_FEATURE_MAP[feature];
  if (!key) {
    if (feature.startsWith("employee_")) {
      return roleId === "employee" || hasCompanyPermission(roleId, "assigned_jobs");
    }
    return hasCompanyPermission(roleId, "all");
  }
  return hasCompanyPermission(roleId, key);
}

/** Synchronous gate when role is already known. */
export function canAccessForRole(
  feature: AppFeature,
  role: AppRole,
  permissions?: EmployeePermissions,
  companyRole?: CompanyRoleId | null,
): boolean {
  if (companyRole) {
    if (feature === "subscriptions" && !canManageSubscription(companyRole)) return false;
    if (feature === "company_user_management" && !canAccessForCompanyRole(feature, companyRole)) {
      return false;
    }
    if (companyRole === "superintendent" || companyRole === "check_guy" || companyRole === "employee") {
      return canAccessForCompanyRole(feature, companyRole);
    }
    if (companyRole === "admin" && feature === "subscriptions") return false;
  }

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
  const [role, companyRole] = await Promise.all([
    resolveCurrentAppRole(),
    resolveCurrentCompanyRole(),
  ]);
  const session = await loadEmployeeSession();
  return canAccessForRole(feature, role, session.permissions, companyRole);
}

/** Paths employees may open — mirrors lib/auth/permissions.ts. */
export const EMPLOYEE_ALLOWED_PATH_PREFIXES = [
  "/employee",
  "/invite",
  "/job-folder/current-jobs",
  "/job-folder/job-photos",
  "/job-folder/schedule",
  "/calendar",
] as const;

/** Boss-only routes (financial, subscriptions, full job folder hub). */
export const BOSS_BLOCKED_PATH_PREFIXES_FOR_EMPLOYEE = [
  "/",
  "/upgrade",
  "/pay",
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
  "/settings/in-app-purchases",
  "/settings/ai-addons",
  "/settings/ai-usage",
  "/settings/admin-free-access",
  "/settings/storage-backup",
  "/getting-paid",
  "/estimates",
  "/subscribe",
  "/misc-apps",
  "/materials-search",
  "/material-list",
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
  "/service-calls",
  "/onboarding",
  "/distributor",
  "/business-card",
  "/weather",
] as const;

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  const p = pathname.toLowerCase();
  const pre = prefix.toLowerCase();
  return p === pre || p.startsWith(`${pre}/`);
}

export function isPathAllowedForEmployee(pathname: string): boolean {
  return isEmployeeAllowedRoute(pathname);
}

export function isPathBlockedForRole(
  pathname: string,
  role: AppRole,
  companyRole?: CompanyRoleId | null,
): boolean {
  if (companyRole === "superintendent") {
    const p = pathname.toLowerCase();
    if (p.startsWith("/superintendent")) return false;
    if (p === "/settings/user-info" || p.startsWith("/settings/user-info/")) return false;
    return true;
  }
  if (companyRole === "check_guy") {
    const p = pathname.toLowerCase();
    if (p.startsWith("/check-guy")) return false;
    if (p === "/settings/user-info" || p.startsWith("/settings/user-info/")) return false;
    return true;
  }

  const workspaceRole = resolveWorkspaceRole(role, companyRole);
  if (workspaceRole === "boss_man") {
    return false;
  }

  return isRouteBlockedForWorkspace(pathname, workspaceRole);
}

export async function isPathBlockedForCurrentRole(pathname: string): Promise<boolean> {
  const [role, companyRole] = await Promise.all([
    resolveCurrentAppRole(),
    resolveCurrentCompanyRole(),
  ]);
  return isPathBlockedForRole(pathname, role, companyRole);
}

/** Route-level access using workspace RBAC. */
export function canAccessPathForRole(
  pathname: string,
  role: AppRole,
  companyRole?: CompanyRoleId | null,
): boolean {
  const workspaceRole = resolveWorkspaceRole(role, companyRole);
  return canAccessRoute(pathname, workspaceRole);
}

/** Action-level access using workspace RBAC. */
export function canPerformActionForRole(
  action: EmployeeAction,
  role: AppRole,
  companyRole?: CompanyRoleId | null,
): boolean {
  const workspaceRole = resolveWorkspaceRole(role, companyRole);
  return canPerform(action, workspaceRole);
}

export type { WorkspaceRole, EmployeeAction };
