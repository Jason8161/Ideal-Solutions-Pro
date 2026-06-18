import type { Response, NextFunction } from "express";

import type { AppAuthContext } from "../company/types";
import { hasPermission, type CompanyRoleId } from "../company/roles";

/** Express request with company auth context attached by middleware. */
export type CompanyAuthRequest = {
  companyAuth?: AppAuthContext;
};

export function isBossRole(roleId: CompanyRoleId): boolean {
  return roleId === "owner" || roleId === "admin";
}

export function isEmployeeRole(roleId: CompanyRoleId): boolean {
  return roleId === "employee";
}

/** Block employees from boss-only company API routes. */
export function requireBossRole(
  req: CompanyAuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const ctx = req.companyAuth;
  if (!ctx) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  if (!isBossRole(ctx.roleId)) {
    res.status(403).json({ ok: false, error: "Boss access required." });
    return;
  }
  next();
}

/** Require a specific company permission key. */
export function requireCompanyPermission(
  permission: Parameters<typeof hasPermission>[1],
  req: CompanyAuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const ctx = req.companyAuth;
  if (!ctx) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  if (!hasPermission(ctx.roleId, permission)) {
    res.status(403).json({ ok: false, error: "Permission denied." });
    return;
  }
  next();
}

/** Employees may only access their own employeeId in query/body. */
export function assertEmployeeSelfScope(
  ctx: AppAuthContext,
  employeeId: string | undefined,
): boolean {
  if (!isEmployeeRole(ctx.roleId)) return true;
  if (!employeeId) return false;
  // When cloud employee id is linked on account, enforce match (scaffold for full backend link).
  const linked = (ctx as AppAuthContext & { employeeId?: string }).employeeId;
  if (linked && linked !== employeeId) return false;
  return true;
}
