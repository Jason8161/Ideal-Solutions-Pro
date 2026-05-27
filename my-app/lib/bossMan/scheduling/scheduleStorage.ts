import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  EmployeeAvailabilityStatus,
  EmployeeDayAvailability,
  ScheduleAssignment,
  ScheduleAssignmentPriority,
  ScheduleAssignmentStatus,
} from "./types";
import { SCHEDULE_ASSIGNMENT_STATUSES } from "./types";

export const SCHEDULE_ASSIGNMENTS_KEY = "ideal_solutions_schedule_assignments_v1";
export const SCHEDULE_EMPLOYEE_AVAILABILITY_KEY = "ideal_solutions_schedule_employee_availability_v1";

function newId(): string {
  return `sa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function trimOptional(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

function normalizeAssignment(raw: unknown): ScheduleAssignment | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Partial<ScheduleAssignment>;
  if (typeof row.id !== "string" || typeof row.date !== "string" || typeof row.jobId !== "string") {
    return null;
  }
  const employeeIds = Array.isArray(row.employeeIds)
    ? row.employeeIds.filter((id): id is string => typeof id === "string")
    : [];
  const priority: ScheduleAssignmentPriority =
    row.priority === "high" || row.priority === "urgent" ? row.priority : "normal";
  const status: ScheduleAssignmentStatus =
    row.status && SCHEDULE_ASSIGNMENT_STATUSES.includes(row.status as ScheduleAssignmentStatus)
      ? (row.status as ScheduleAssignmentStatus)
      : "Scheduled";
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString();
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : createdAt;
  const startTime = typeof row.startTime === "string" ? row.startTime : "08:00";

  return {
    id: row.id,
    assignmentId: typeof row.assignmentId === "string" ? row.assignmentId : undefined,
    companyId: typeof row.companyId === "string" ? row.companyId : undefined,
    date: row.date,
    startTime,
    endTime: typeof row.endTime === "string" ? row.endTime : undefined,
    durationMinutes: typeof row.durationMinutes === "number" ? row.durationMinutes : undefined,
    jobId: row.jobId,
    employeeIds,
    notes: trimOptional(row.notes),
    materialsNotes: trimOptional(row.materialsNotes),
    priority,
    status,
    sentAt: typeof row.sentAt === "string" ? row.sentAt : undefined,
    createdAt,
    updatedAt,
  };
}

async function loadAssignmentsRaw(): Promise<ScheduleAssignment[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_ASSIGNMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeAssignment).filter((a): a is ScheduleAssignment => a !== null);
  } catch {
    return [];
  }
}

async function saveAssignmentsRaw(rows: ScheduleAssignment[]): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_ASSIGNMENTS_KEY, JSON.stringify(rows));
}

export async function loadScheduleAssignments(): Promise<ScheduleAssignment[]> {
  const rows = await loadAssignmentsRaw();
  return rows.sort((a, b) => {
    const day = a.date.localeCompare(b.date);
    if (day !== 0) return day;
    return a.startTime.localeCompare(b.startTime);
  });
}

export async function getScheduleAssignmentById(id: string): Promise<ScheduleAssignment | null> {
  const rows = await loadAssignmentsRaw();
  return rows.find((a) => a.id === id) ?? null;
}

export async function assignmentsForDay(dayKey: string): Promise<ScheduleAssignment[]> {
  const rows = await loadAssignmentsRaw();
  return rows
    .filter((a) => a.date === dayKey && a.status !== "Cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function assignmentsForJob(jobId: string): Promise<ScheduleAssignment[]> {
  const rows = await loadAssignmentsRaw();
  return rows.filter((a) => a.jobId === jobId && a.status !== "Cancelled");
}

export type UpsertScheduleAssignmentInput = {
  id?: string;
  assignmentId?: string;
  companyId?: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  jobId: string;
  employeeIds: string[];
  notes?: string;
  materialsNotes?: string;
  priority?: ScheduleAssignmentPriority;
  status?: ScheduleAssignmentStatus;
};

export async function upsertScheduleAssignment(
  input: UpsertScheduleAssignmentInput,
): Promise<ScheduleAssignment> {
  const rows = await loadAssignmentsRaw();
  const now = new Date().toISOString();
  const existingIdx = input.id ? rows.findIndex((a) => a.id === input.id) : -1;

  const assignment: ScheduleAssignment = {
    id: input.id ?? newId(),
    assignmentId: input.assignmentId,
    companyId: input.companyId,
    date: input.date.trim(),
    startTime: input.startTime.trim(),
    endTime: trimOptional(input.endTime),
    durationMinutes: input.durationMinutes,
    jobId: input.jobId,
    employeeIds: [...new Set(input.employeeIds)],
    notes: trimOptional(input.notes),
    materialsNotes: trimOptional(input.materialsNotes),
    priority: input.priority ?? "normal",
    status: input.status ?? "Scheduled",
    sentAt: existingIdx >= 0 ? rows[existingIdx].sentAt : undefined,
    createdAt: existingIdx >= 0 ? rows[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    rows[existingIdx] = assignment;
  } else {
    rows.push(assignment);
  }
  await saveAssignmentsRaw(rows);
  return assignment;
}

export async function deleteScheduleAssignment(id: string): Promise<boolean> {
  const rows = await loadAssignmentsRaw();
  const next = rows.filter((a) => a.id !== id);
  if (next.length === rows.length) return false;
  await saveAssignmentsRaw(next);
  return true;
}

export async function markScheduleAssignmentSent(id: string): Promise<ScheduleAssignment | null> {
  const rows = await loadAssignmentsRaw();
  const idx = rows.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  rows[idx] = {
    ...rows[idx],
    status: "Sent",
    sentAt: now,
    updatedAt: now,
  };
  await saveAssignmentsRaw(rows);
  return rows[idx];
}

function availabilityKey(employeeId: string, date: string): string {
  return `${employeeId}::${date}`;
}

async function loadAvailabilityRaw(): Promise<EmployeeDayAvailability[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_EMPLOYEE_AVAILABILITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is EmployeeDayAvailability =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as EmployeeDayAvailability).employeeId === "string" &&
        typeof (row as EmployeeDayAvailability).date === "string" &&
        typeof (row as EmployeeDayAvailability).status === "string",
    );
  } catch {
    return [];
  }
}

async function saveAvailabilityRaw(rows: EmployeeDayAvailability[]): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_EMPLOYEE_AVAILABILITY_KEY, JSON.stringify(rows));
}

export async function loadEmployeeDayAvailability(): Promise<EmployeeDayAvailability[]> {
  return loadAvailabilityRaw();
}

export async function getEmployeeAvailabilityForDay(
  employeeId: string,
  date: string,
): Promise<EmployeeAvailabilityStatus> {
  const rows = await loadAvailabilityRaw();
  const hit = rows.find((r) => r.employeeId === employeeId && r.date === date);
  return hit?.status ?? "available";
}

export async function setEmployeeAvailabilityForDay(
  employeeId: string,
  date: string,
  status: EmployeeAvailabilityStatus,
): Promise<void> {
  const rows = await loadAvailabilityRaw();
  const key = availabilityKey(employeeId, date);
  const now = new Date().toISOString();
  const idx = rows.findIndex((r) => availabilityKey(r.employeeId, r.date) === key);
  const row: EmployeeDayAvailability = { employeeId, date, status, updatedAt: now };
  if (idx >= 0) {
    rows[idx] = row;
  } else {
    rows.push(row);
  }
  await saveAvailabilityRaw(rows);
}

export function assignedJobIdForEmployeeOnDay(
  assignments: ScheduleAssignment[],
  employeeId: string,
  dayKey: string,
): string | undefined {
  const hit = assignments.find(
    (a) =>
      a.date === dayKey &&
      a.status !== "Cancelled" &&
      a.status !== "Completed" &&
      a.employeeIds.includes(employeeId),
  );
  return hit?.jobId;
}
