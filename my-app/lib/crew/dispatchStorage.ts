import AsyncStorage from "@react-native-async-storage/async-storage";

import { appendCrewActivity } from "./activityLog";

export type LocalDispatchNotificationStub = {
  id: string;
  employeeId: string;
  assignmentId?: string;
  title: string;
  body: string;
  createdAt: string;
  /** Placeholder until push / in-app delivery ships. */
  delivered: boolean;
};

export type CrewEmergencyFlag = {
  employeeId: string;
  /** Local calendar day YYYY-MM-DD */
  date: string;
  reason?: string;
  updatedAt: string;
};

const EMERGENCY_KEY = "ideal_solutions_crew_emergency_flags_v1";
const NOTIFICATIONS_KEY = "ideal_solutions_crew_local_notifications_v1";

function newNotificationId(): string {
  return `cdn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadEmergencyFlags(): Promise<CrewEmergencyFlag[]> {
  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is CrewEmergencyFlag =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as CrewEmergencyFlag).employeeId === "string" &&
        typeof (row as CrewEmergencyFlag).date === "string",
    );
  } catch {
    return [];
  }
}

async function saveEmergencyFlags(rows: CrewEmergencyFlag[]): Promise<void> {
  await AsyncStorage.setItem(EMERGENCY_KEY, JSON.stringify(rows));
}

export async function getEmergencyEmployeeIdsForDay(dayKey: string): Promise<Set<string>> {
  const rows = await loadEmergencyFlags();
  return new Set(rows.filter((r) => r.date === dayKey).map((r) => r.employeeId));
}

export async function setEmployeeEmergency(
  employeeId: string,
  dayKey: string,
  active: boolean,
  reason?: string,
): Promise<void> {
  const rows = await loadEmergencyFlags();
  const without = rows.filter((r) => !(r.employeeId === employeeId && r.date === dayKey));
  if (active) {
    without.push({
      employeeId,
      date: dayKey,
      reason: reason?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    await appendCrewActivity({
      type: "emergency_dispatch",
      message: "Employee flagged for emergency dispatch",
      employeeId,
    });
  }
  await saveEmergencyFlags(without);
}

async function loadNotificationStubs(): Promise<LocalDispatchNotificationStub[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalDispatchNotificationStub[]) : [];
  } catch {
    return [];
  }
}

async function saveNotificationStubs(rows: LocalDispatchNotificationStub[]): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(rows.slice(0, 100)));
}

/** Local-only stub — records intent until push notifications are wired. */
export async function queueLocalDispatchNotification(input: {
  employeeId: string;
  assignmentId?: string;
  title: string;
  body: string;
}): Promise<LocalDispatchNotificationStub> {
  const rows = await loadNotificationStubs();
  const stub: LocalDispatchNotificationStub = {
    id: newNotificationId(),
    employeeId: input.employeeId,
    assignmentId: input.assignmentId,
    title: input.title.trim(),
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    delivered: false,
  };
  rows.unshift(stub);
  await saveNotificationStubs(rows);
  return stub;
}

export async function listPendingLocalNotifications(): Promise<LocalDispatchNotificationStub[]> {
  const rows = await loadNotificationStubs();
  return rows.filter((r) => !r.delivered);
}
