import type { BossJob } from "@/lib/bossMan/types";
import type { Employee } from "@/lib/employees/types";

import { isDayInScheduleWindow } from "./dateUtils";
import type { EmployeeDayAvailability, ScheduleAssignment, ScheduleConflict } from "./types";
import { getEmployeeAvailabilityForDay } from "./scheduleStorage";

export type ConflictCheckContext = {
  assignment: Pick<
    ScheduleAssignment,
    "id" | "date" | "startTime" | "endTime" | "jobId" | "employeeIds"
  >;
  allAssignments: ScheduleAssignment[];
  jobs: BossJob[];
  employees: Employee[];
  availability?: EmployeeDayAvailability[];
};

function timeToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

function endMinutes(row: Pick<ScheduleAssignment, "startTime" | "endTime" | "durationMinutes">): number {
  if (row.endTime) return timeToMinutes(row.endTime);
  if (row.durationMinutes) return timeToMinutes(row.startTime) + row.durationMinutes;
  return timeToMinutes(row.startTime) + 8 * 60;
}

function overlapsTime(a: ScheduleAssignment, b: ScheduleAssignment): boolean {
  if (a.date !== b.date) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = endMinutes(a);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = endMinutes(b);
  return aStart < bEnd && bStart < aEnd;
}

export async function checkScheduleConflicts(
  ctx: ConflictCheckContext,
): Promise<ScheduleConflict[]> {
  const conflicts: ScheduleConflict[] = [];
  const { assignment, allAssignments, jobs, employees } = ctx;

  if (!isDayInScheduleWindow(assignment.date)) {
    conflicts.push({
      code: "outside_window",
      message: "Date is outside the 4-week scheduling window.",
    });
  }

  if (assignment.employeeIds.length === 0) {
    conflicts.push({
      code: "job_no_employees",
      message: "No crew assigned to this job.",
    });
  }

  const job = jobs.find((j) => j.id === assignment.jobId);
  const crewNeeded = job?.crewSizeNeeded;
  if (crewNeeded != null && crewNeeded > 0 && assignment.employeeIds.length < crewNeeded) {
    conflicts.push({
      code: "crew_understaffed",
      message: `Assigned ${assignment.employeeIds.length} of ${crewNeeded} crew needed.`,
    });
  }

  for (const employeeId of assignment.employeeIds) {
    const status = ctx.availability
      ? ctx.availability.find((a) => a.employeeId === employeeId && a.date === assignment.date)
          ?.status
      : await getEmployeeAvailabilityForDay(employeeId, assignment.date);

    if (status && status !== "available") {
      const emp = employees.find((e) => e.id === employeeId);
      conflicts.push({
        code: "employee_unavailable",
        message: `${emp ? `${emp.firstName} ${emp.lastName}`.trim() : "Employee"} marked ${status} on this day.`,
        employeeId,
      });
    }

    const others = allAssignments.filter(
      (a) =>
        a.id !== assignment.id &&
        a.status !== "Cancelled" &&
        a.employeeIds.includes(employeeId),
    );
    for (const other of others) {
      if (other.date === assignment.date && overlapsTime(assignment as ScheduleAssignment, other)) {
        conflicts.push({
          code: "employee_double_booked",
          message: `Double-booked on ${assignment.date}.`,
          employeeId,
          assignmentId: other.id,
        });
        break;
      }
    }
  }

  return conflicts;
}

export function hasBlockingConflicts(conflicts: ScheduleConflict[]): boolean {
  return conflicts.some(
    (c) =>
      c.code === "employee_double_booked" ||
      c.code === "outside_window" ||
      c.code === "employee_unavailable",
  );
}
