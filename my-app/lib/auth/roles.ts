import type { CloudRole } from "@/lib/cloud/types";

/** App-facing roles (single codebase; maps to workspace + local session). */
export type AppRole = "admin" | "contractor" | "employee";

/** Pro / boss store listing default when no employee session. */
export const DEFAULT_BOSS_ROLE: AppRole = "contractor";

export function isBossAppRole(role: AppRole): boolean {
  return role === "admin" || role === "contractor";
}

export function isEmployeeAppRole(role: AppRole): boolean {
  return role === "employee";
}

/** Cloud workspace uses boss | employee; app uses admin | contractor | employee. */
export function cloudRoleToAppRole(roleId: CloudRole): AppRole {
  if (roleId === "employee") return "employee";
  return "contractor";
}

export function appRoleToCloudRole(role: AppRole): CloudRole {
  return role === "employee" ? "employee" : "boss";
}

export function appRoleLabel(role: AppRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "contractor":
      return "Contractor";
    case "employee":
      return "Employee";
    default:
      return role;
  }
}
