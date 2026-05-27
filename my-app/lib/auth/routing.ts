import type { Href } from "expo-router";

import { isEmployeeAppVariant } from "@/lib/auth/appVariant";
import { isBossAppRole, isEmployeeAppRole, type AppRole } from "@/lib/auth/roles";

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
