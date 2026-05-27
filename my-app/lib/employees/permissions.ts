import type { Employee, EmployeeRole } from "./types";

export type CrewViewerContext = {
  /** When set, viewer is an employee session (technician self-view). */
  viewerEmployeeId?: string | null;
  /** Boss / owner mode — full crew management. */
  isBoss?: boolean;
};

const ROLE_RANK: Record<EmployeeRole, number> = {
  technician: 1,
  foreman: 2,
  office: 3,
  admin: 4,
};

export function normalizeEmployeeRole(role: EmployeeRole | undefined): EmployeeRole {
  return role ?? "technician";
}

export function canManageCrew(ctx: CrewViewerContext): boolean {
  return !!ctx.isBoss;
}

export function canDispatch(ctx: CrewViewerContext): boolean {
  return !!ctx.isBoss;
}

export function canViewPayrollDetails(ctx: CrewViewerContext, employee: Employee): boolean {
  if (ctx.isBoss) return true;
  return !!ctx.viewerEmployeeId && ctx.viewerEmployeeId === employee.id;
}

/** Technicians in employee mode only see their own assigned work. */
export function isTechnicianSelfView(ctx: CrewViewerContext, employee?: Employee | null): boolean {
  if (ctx.isBoss) return false;
  if (!ctx.viewerEmployeeId) return false;
  const role = normalizeEmployeeRole(employee?.role);
  return role === "technician" || ctx.viewerEmployeeId === employee?.id;
}

export function canViewEmployeeProfile(
  ctx: CrewViewerContext,
  target: Employee,
): boolean {
  if (ctx.isBoss) return true;
  if (!ctx.viewerEmployeeId) return true;
  return ctx.viewerEmployeeId === target.id;
}

export function filterEmployeesForViewer(
  rows: Employee[],
  ctx: CrewViewerContext,
): Employee[] {
  if (ctx.isBoss || !ctx.viewerEmployeeId) return rows;
  const self = rows.find((e) => e.id === ctx.viewerEmployeeId);
  if (!self) return [];
  if (normalizeEmployeeRole(self.role) === "technician") {
    return [self];
  }
  return rows;
}

export function roleAtLeast(role: EmployeeRole | undefined, minimum: EmployeeRole): boolean {
  return ROLE_RANK[normalizeEmployeeRole(role)] >= ROLE_RANK[minimum];
}
