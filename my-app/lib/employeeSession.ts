import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppRole } from "@/lib/auth/roles";
import {
  clearPersistedCompanyRole,
  loadPersistedAppRole,
  loadPersistedCompanyRole,
  persistRoleAsBoss,
  persistRoleAsEmployee,
  savePersistedCompanyRole,
} from "@/lib/auth/sessionRole";
import type { EmployeePermissions } from "@/lib/cloud/types";

/** AsyncStorage key — employee cloud session (invite redeem or dev toggle). */
export const EMPLOYEE_SESSION_STORAGE_KEY = "ideal_employee_session_v1";

const SESSION_KEY = EMPLOYEE_SESSION_STORAGE_KEY;

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

function employeeLog(message: string, detail?: Record<string, unknown>): void {
  const extra = detail ? ` ${JSON.stringify(detail)}` : "";
  console.warn(`[EMPLOYEE] ${message}${extra}`);
}

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

/** Persists session + role keys; returns false when verification fails. */
export async function saveEmployeeSession(session: EmployeeSession): Promise<boolean> {
  try {
    const normalized: EmployeeSession = session.active
      ? { ...session, role: session.role ?? "employee" }
      : { active: false };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    if (normalized.active) {
      await persistRoleAsEmployee();
      await savePersistedCompanyRole("employee");
    }
    const loaded = await loadEmployeeSession();
    const role = await loadPersistedAppRole();
    const companyRole = await loadPersistedCompanyRole();
    const ok = loaded.active === normalized.active;
    employeeLog("employee session saved", {
      ok,
      active: loaded.active,
      companyId: loaded.companyId ?? null,
      companyName: loaded.companyName ?? null,
    });
    employeeLog("employee role saved", { role, companyRole });
    return ok;
  } catch (error) {
    employeeLog("employee session saved", { ok: false, error: String(error) });
    return false;
  }
}

export async function clearEmployeeSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  await clearPersistedCompanyRole();
  await persistRoleAsBoss();
  employeeLog("employee session cleared");
}

/** True when the app should treat the user as a field employee (not the owner). */
export async function isEmployeeSessionActive(): Promise<boolean> {
  const session = await loadEmployeeSession();
  return session.active;
}
