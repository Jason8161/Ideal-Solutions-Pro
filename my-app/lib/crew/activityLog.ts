import AsyncStorage from "@react-native-async-storage/async-storage";

export type CrewActivityType =
  | "employee_added"
  | "employee_updated"
  | "dispatch_sent"
  | "assignment_created"
  | "assignment_completed"
  | "emergency_dispatch"
  | "invite_sent"
  | "status_changed";

export type CrewActivityEntry = {
  id: string;
  type: CrewActivityType;
  message: string;
  employeeId?: string;
  jobId?: string;
  assignmentId?: string;
  createdAt: string;
};

const STORAGE_KEY = "ideal_solutions_crew_activity_log_v1";
const MAX_ENTRIES = 200;

function newId(): string {
  return `cal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadAll(): Promise<CrewActivityEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is CrewActivityEntry =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as CrewActivityEntry).id === "string" &&
        typeof (row as CrewActivityEntry).message === "string" &&
        typeof (row as CrewActivityEntry).createdAt === "string",
    );
  } catch {
    return [];
  }
}

async function saveAll(rows: CrewActivityEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, MAX_ENTRIES)));
}

export async function appendCrewActivity(
  entry: Omit<CrewActivityEntry, "id" | "createdAt"> & { createdAt?: string },
): Promise<CrewActivityEntry> {
  const rows = await loadAll();
  const row: CrewActivityEntry = {
    id: newId(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    type: entry.type,
    message: entry.message.trim(),
    employeeId: entry.employeeId,
    jobId: entry.jobId,
    assignmentId: entry.assignmentId,
  };
  rows.unshift(row);
  await saveAll(rows);
  return row;
}

export async function listRecentCrewActivity(limit = 25): Promise<CrewActivityEntry[]> {
  const rows = await loadAll();
  return rows
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, limit));
}
