import AsyncStorage from "@react-native-async-storage/async-storage";

import { listCloudAssignments } from "@/lib/cloud/client";
import type { CloudJobAssignment } from "@/lib/cloud/types";
import { loadEmployeeSession } from "@/lib/employeeSession";

const CACHE_KEY = "ideal_employee_job_assignments_v1";

export async function cacheEmployeeAssignments(rows: CloudJobAssignment[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rows));
}

export async function loadCachedEmployeeAssignments(): Promise<CloudJobAssignment[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CloudJobAssignment[]) : [];
  } catch {
    return [];
  }
}

/** Pull assignments from cloud when employee has auth token; updates local cache. */
export async function syncEmployeeAssignments(): Promise<CloudJobAssignment[]> {
  const session = await loadEmployeeSession();
  if (!session.active || !session.cloudAuthToken) {
    return loadCachedEmployeeAssignments();
  }
  try {
    const rows = await listCloudAssignments(session.cloudAuthToken);
    await cacheEmployeeAssignments(rows);
    return rows;
  } catch {
    return loadCachedEmployeeAssignments();
  }
}

/** Local job ids assigned to this employee (maps cloud jobId to local when synced). */
export async function getAssignedLocalJobIds(): Promise<Set<string>> {
  const session = await loadEmployeeSession();
  const assignments = await loadCachedEmployeeAssignments();
  const ids = new Set<string>();
  for (const a of assignments) {
    if (session.cloudEmployeeId && a.employeeId !== session.cloudEmployeeId) continue;
    ids.add(a.jobId);
  }
  return ids;
}
