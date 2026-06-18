import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CloudRole } from "@/lib/cloud/types";
import { loadEmployeeSession } from "@/lib/employeeSession";
import { loadUserProfile } from "@/lib/auth/userProfileStorage";
import type { CompanyRoleId } from "@/lib/permissions/companyRoles";
import { isCompanyRoleId } from "@/lib/permissions/companyRoles";

import { cloudRoleToAppRole, DEFAULT_BOSS_ROLE, type AppRole } from "./roles";

const ROLE_SESSION_KEY = "ideal_workspace_role_v1";
const COMPANY_ROLE_KEY = "ideal_company_role_v1";

export async function loadPersistedCompanyRole(): Promise<CompanyRoleId | null> {
  try {
    const raw = await AsyncStorage.getItem(COMPANY_ROLE_KEY);
    if (!raw) return null;
    return isCompanyRoleId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function savePersistedCompanyRole(roleId: CompanyRoleId): Promise<void> {
  await AsyncStorage.setItem(COMPANY_ROLE_KEY, roleId);
}

export async function clearPersistedCompanyRole(): Promise<void> {
  await AsyncStorage.removeItem(COMPANY_ROLE_KEY);
}

export async function loadPersistedAppRole(): Promise<AppRole | null> {
  try {
    const raw = await AsyncStorage.getItem(ROLE_SESSION_KEY);
    if (!raw) return null;
    const role = raw.trim() as AppRole;
    if (role === "admin" || role === "contractor" || role === "employee") return role;
    return null;
  } catch {
    return null;
  }
}

export async function savePersistedAppRole(role: AppRole): Promise<void> {
  await AsyncStorage.setItem(ROLE_SESSION_KEY, role);
}

export async function clearPersistedAppRole(): Promise<void> {
  await AsyncStorage.removeItem(ROLE_SESSION_KEY);
}

/**
 * Effective role for routing and feature gates.
 * Company profile role wins; employee session; persisted role; contractor default.
 */
export async function resolveCurrentCompanyRole(): Promise<CompanyRoleId | null> {
  const employee = await loadEmployeeSession();
  if (employee.active) return "employee";

  const profile = await loadUserProfile();
  if (profile?.roleId && isCompanyRoleId(profile.roleId)) {
    return profile.roleId;
  }
  const stored = await loadPersistedCompanyRole();
  if (stored) return stored;
  return null;
}

export async function resolveCurrentAppRole(): Promise<AppRole> {
  const employee = await loadEmployeeSession();
  if (employee.active) {
    return employee.role ?? "employee";
  }

  const companyRole = await resolveCurrentCompanyRole();
  if (companyRole === "employee") return "employee";
  if (companyRole === "admin") return "admin";
  if (companyRole === "owner") return "contractor";

  const stored = await loadPersistedAppRole();
  if (stored) return stored;
  return DEFAULT_BOSS_ROLE;
}

export async function persistCompanyRoleFromProfile(roleId: CompanyRoleId | null): Promise<void> {
  if (roleId && isCompanyRoleId(roleId)) {
    await savePersistedCompanyRole(roleId);
  }
}

export async function persistRoleFromCloud(roleId: CloudRole): Promise<AppRole> {
  const role = cloudRoleToAppRole(roleId);
  await savePersistedAppRole(role);
  return role;
}

export async function persistRoleAsEmployee(): Promise<void> {
  await savePersistedAppRole("employee");
}

export async function persistRoleAsBoss(): Promise<void> {
  await savePersistedAppRole(DEFAULT_BOSS_ROLE);
}
