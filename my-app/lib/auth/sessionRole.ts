import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CloudRole } from "@/lib/cloud/types";
import { loadEmployeeSession } from "@/lib/employeeSession";

import { cloudRoleToAppRole, DEFAULT_BOSS_ROLE, type AppRole } from "./roles";

const ROLE_SESSION_KEY = "ideal_workspace_role_v1";

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
 * Employee session wins; else persisted role; else contractor (boss default).
 */
export async function resolveCurrentAppRole(): Promise<AppRole> {
  const employee = await loadEmployeeSession();
  if (employee.active) {
    return employee.role ?? "employee";
  }
  const stored = await loadPersistedAppRole();
  if (stored) return stored;
  return DEFAULT_BOSS_ROLE;
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
