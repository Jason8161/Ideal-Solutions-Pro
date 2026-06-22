import type { Href } from "expo-router";

import { isEmployeeAppVariant } from "@/lib/auth/appVariant";
import { isBossAppRole, isEmployeeAppRole, type AppRole } from "@/lib/auth/roles";
import type { CompanyRoleId } from "@/lib/permissions/companyRoles";
import { isCompanyRoleId } from "@/lib/permissions/companyRoles";

/** Primary home after login / cold start for company role. */
export function getHomeRouteForCompanyRole(roleId: CompanyRoleId): Href {
  switch (roleId) {
    case "employee":
      return "/employee" as Href;
    case "superintendent":
      return "/superintendent" as Href;
    case "check_guy":
      return "/check-guy" as Href;
    case "admin":
    case "owner":
    default:
      return "/" as Href;
  }
}

/** Resolve home route from profile role or legacy app role. */
export function getHomeRouteForSession(roleId: CompanyRoleId | null, appRole: AppRole): Href {
  if (roleId && isCompanyRoleId(roleId)) {
    return getHomeRouteForCompanyRole(roleId);
  }
  return getHomeRouteForRole(appRole);
}

/** Primary home after login / cold start for this role + store variant. */
export function getHomeRouteForRole(role: AppRole): Href {
  if (isEmployeeAppRole(role) || isEmployeeAppVariant()) {
    return "/employee" as Href;
  }
  return "/" as Href;
}

export function shouldForceEmployeeHome(role: AppRole): boolean {
  return isEmployeeAppRole(role) || isEmployeeAppVariant();
}

export function shouldBlockBossOnEmployeeRoute(role: AppRole, pathname: string): boolean {
  if (!pathname.startsWith("/employee")) return false;
  return isBossAppRole(role);
}

export function shouldBlockEmployeeOnBossRoute(role: AppRole, pathname: string): boolean {
  if (!isEmployeeAppRole(role)) return false;
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return true;
  return false;
}
