import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppRole } from "@/lib/auth/roles";
import {
  persistRoleAsBoss,
  persistRoleAsEmployee,
  savePersistedCompanyRole,
} from "@/lib/auth/sessionRole";
import type { EmployeePermissions } from "@/lib/cloud/types";

const SESSION_KEY = "ideal_employee_session_v1";

export type EmployeeSession = {
  active: boolean;
  /** Workspace app role when in employee mode. */
  role?: AppRole;
  /** Links usage to a crew record when available */
  employeeId?: string;
  displayName?: string;
  /** Cloud workspace (after invite redeem) */
  companyId?: string;
  companyName?: string;
  cloudUserId?: string;
  cloudEmployeeId?: string;
  cloudAuthToken?: string;
  permissions?: EmployeePermissions;
};

const DEFAULT_SESSION: EmployeeSession = { active: false };

export async function loadEmployeeSession(): Promise<EmployeeSession> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_SESSION;
    const parsed = JSON.parse(raw) as Partial<EmployeeSession>;
    const role =
      parsed.role === "employee" || parsed.role === "admin" || parsed.role === "contractor"
        ? parsed.role
        : parsed.active
          ? "employee"
          : undefined;
    return {
      active: parsed.active === true,
      role,
      employeeId: parsed.employeeId?.trim() || undefined,
      displayName: parsed.displayName?.trim() || undefined,
      companyId: parsed.companyId?.trim() || undefined,
      companyName: parsed.companyName?.trim() || undefined,
      cloudUserId: parsed.cloudUserId?.trim() || undefined,
      cloudEmployeeId: parsed.cloudEmployeeId?.trim() || undefined,
      cloudAuthToken: parsed.cloudAuthToken?.trim() || undefined,
      permissions: parsed.permissions,
    };
  } catch {
    return DEFAULT_SESSION;
  }
}

export async function saveEmployeeSession(session: EmployeeSession): Promise<void> {
  const normalized: EmployeeSession = session.active
    ? { ...session, role: session.role ?? "employee" }
    : { active: false };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  if (normalized.active) {
    await persistRoleAsEmployee();
    await savePersistedCompanyRole("employee");
  }
}

export async function clearEmployeeSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  await persistRoleAsBoss();
}

/** True when the app should treat the user as a field employee (not the owner). */
export async function isEmployeeSessionActive(): Promise<boolean> {
  const session = await loadEmployeeSession();
  return session.active;
}
