import type { EmployeePermissions } from "@/lib/cloud/types";
import { resolveCurrentAppRole } from "@/lib/auth/sessionRole";
import {
  canAccessForRole,
  isPathBlockedForRole,
  type AppFeature,
} from "@/lib/permissions/roleAccess";
import { loadEmployeeSession } from "@/lib/employeeSession";

/** @deprecated Use AppFeature from lib/permissions/roleAccess — kept for existing imports. */
export type EmployeeFeature =
  | "jobs_all"
  | "jobs_assigned"
  | "schedule"
  | "messages"
  | "time_clock"
  | "job_photos"
  | "tasks"
  | "material_requests"
  | "daily_notes"
  | "billing"
  | "estimates"
  | "invoices"
  | "company_financials"
  | "admin_settings"
  | "employee_ai";

const LEGACY_TO_APP_FEATURE: Partial<Record<EmployeeFeature, AppFeature>> = {
  jobs_all: "job_folder_admin",
  jobs_assigned: "employee_jobs",
  schedule: "employee_schedule",
  messages: "employee_messages",
  time_clock: "employee_clock",
  job_photos: "employee_photos",
  tasks: "employee_tasks",
  material_requests: "employee_material_request",
  daily_notes: "employee_daily_notes",
  billing: "subscriptions",
  estimates: "estimates_admin",
  invoices: "invoices_admin",
  company_financials: "settings_financial",
  admin_settings: "crew_admin",
  employee_ai: "employee_ai",
};

export async function canAccess(feature: EmployeeFeature): Promise<boolean> {
  const mapped = LEGACY_TO_APP_FEATURE[feature];
  if (!mapped) return true;
  const role = await resolveCurrentAppRole();
  const session = await loadEmployeeSession();
  return canAccessForRole(mapped, role, session.permissions);
}

/** Paths that employees must not open (boss-only settings / billing). */
export const EMPLOYEE_BLOCKED_PATH_PREFIXES = [
  "/settings/subscribe",
  "/settings/accounting",
  "/settings/accounting-billing",
  "/settings/invoice-customization",
  "/settings/invoice-payments",
  "/settings/payment-apps",
  "/getting-paid",
  "/estimates",
  "/subscribe",
] as const;

export function isPathBlockedForEmployee(pathname: string): boolean {
  return isPathBlockedForRole(pathname, "employee");
}
