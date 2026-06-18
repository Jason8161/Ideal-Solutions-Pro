import type { AppRole } from "@/lib/auth/roles";
import { isEmployeeAppRole } from "@/lib/auth/roles";
import type { CompanyRoleId } from "@/lib/permissions/companyRoles";

/**
 * Portal role for RBAC — `boss_man` = full owner/admin access; `employee` = restricted worker portal.
 * Maps app roles (`admin` / `contractor`) and company role `owner` to `boss_man`.
 */
export type WorkspaceRole = "boss_man" | "employee";

export function resolveWorkspaceRole(
  appRole: AppRole,
  companyRole?: CompanyRoleId | null,
): WorkspaceRole {
  if (companyRole === "employee") return "employee";
  if (isEmployeeAppRole(appRole)) return "employee";
  return "boss_man";
}

/** Routes employees may navigate to (prefix match). */
export const EMPLOYEE_ALLOWED_ROUTE_PREFIXES = [
  "/employee",
  "/invite",
  "/job-folder/current-jobs",
  "/job-folder/job-photos",
  "/job-folder/schedule",
  "/job-folder/job",
  "/calendar",
  "/misc-apps",
] as const;

/** Boss-only route prefixes — employees are redirected away. */
export const BOSS_ONLY_ROUTE_PREFIXES = [
  "/upgrade",
  "/pay",
  "/getting-paid",
  "/misc-apps",
  "/material-list",
  "/materials-search",
  "/estimates",
  "/distributor",
  "/business-card",
  "/weather",
  "/ai-assistance",
  "/subscribe",
  "/settings",
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
  "/superintendent",
  "/check-guy",
  "/service-calls",
  "/onboarding",
] as const;

/** Employee may open only their profile under settings. */
export const EMPLOYEE_ALLOWED_SETTINGS_PATHS = ["/settings/user-info"] as const;

export type EmployeeAction =
  | "view_job"
  | "add_job_photo"
  | "submit_material_list"
  | "add_progress_note"
  | "clock_in_out"
  | "request_vacation"
  | "use_ai_assistant"
  | "purchase_ai_addon"
  | "purchase_storage_addon"
  | "add_personal_calendar_reminder"
  | "post_social_media"
  | "edit_job"
  | "delete_job"
  | "edit_estimate"
  | "edit_invoice"
  | "view_pricing"
  | "view_accounting"
  | "manage_subscription"
  | "manage_employees"
  | "complete_job";

const EMPLOYEE_ALLOWED_ACTIONS: ReadonlySet<EmployeeAction> = new Set([
  "view_job",
  "add_job_photo",
  "submit_material_list",
  "add_progress_note",
  "clock_in_out",
  "request_vacation",
  "use_ai_assistant",
  "purchase_ai_addon",
  "purchase_storage_addon",
  "add_personal_calendar_reminder",
  "post_social_media",
]);

export function canPerform(action: EmployeeAction, workspaceRole: WorkspaceRole): boolean {
  if (workspaceRole === "boss_man") return true;
  return EMPLOYEE_ALLOWED_ACTIONS.has(action);
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  const p = pathname.toLowerCase();
  const pre = prefix.toLowerCase();
  return p === pre || p.startsWith(`${pre}/`);
}

export function isEmployeeAllowedRoute(pathname: string): boolean {
  const p = pathname.toLowerCase();

  if (EMPLOYEE_ALLOWED_SETTINGS_PATHS.some((prefix) => pathMatchesPrefix(p, prefix))) {
    return true;
  }

  if (p.startsWith("/settings")) return false;

  return EMPLOYEE_ALLOWED_ROUTE_PREFIXES.some((prefix) => pathMatchesPrefix(p, prefix));
}

export function isBossOnlyRoute(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return true;
  return BOSS_ONLY_ROUTE_PREFIXES.some((prefix) => pathMatchesPrefix(p, prefix));
}

export function canAccessRoute(pathname: string, workspaceRole: WorkspaceRole): boolean {
  if (workspaceRole === "boss_man") return true;
  return isEmployeeAllowedRoute(pathname);
}

export function isRouteBlockedForWorkspace(pathname: string, workspaceRole: WorkspaceRole): boolean {
  if (workspaceRole === "boss_man") return false;
  return !canAccessRoute(pathname, workspaceRole);
}
