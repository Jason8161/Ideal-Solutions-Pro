import type { EmployeeDayAvailability } from "@/lib/bossMan/scheduling/types";
import type { ScheduleAssignment } from "@/lib/bossMan/scheduling/types";
import type { CrewDispatchStatus } from "@/lib/employees/types";

export type EmployeeDispatchContext = {
  employeeId: string;
  dayKey: string;
  assignments: ScheduleAssignment[];
  availability: EmployeeDayAvailability[];
  emergencyIds: Set<string>;
};

export function resolveEmployeeDispatchStatus(ctx: EmployeeDispatchContext): CrewDispatchStatus {
  if (ctx.emergencyIds.has(ctx.employeeId)) return "emergency";

  const avail = ctx.availability.find(
    (a) => a.employeeId === ctx.employeeId && a.date === ctx.dayKey,
  );
  if (avail?.status === "off" || avail?.status === "vacation" || avail?.status === "sick") {
    return "off_duty";
  }
  if (avail?.status === "unavailable") return "off_duty";

  const activeAssignment = ctx.assignments.find(
    (a) =>
      a.date === ctx.dayKey &&
      a.employeeIds.includes(ctx.employeeId) &&
      a.status !== "Cancelled" &&
      a.status !== "Completed",
  );
  if (activeAssignment) {
    if (activeAssignment.priority === "urgent") return "emergency";
    return "assigned";
  }

  return "available";
}

export function currentJobIdForEmployee(
  assignments: ScheduleAssignment[],
  employeeId: string,
  dayKey: string,
): string | undefined {
  const hit = assignments.find(
    (a) =>
      a.date === dayKey &&
      a.employeeIds.includes(employeeId) &&
      a.status !== "Cancelled" &&
      a.status !== "Completed",
  );
  return hit?.jobId;
}
