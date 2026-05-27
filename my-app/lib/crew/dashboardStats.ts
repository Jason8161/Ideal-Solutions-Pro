import { isBossJobActive, loadBossJobs } from "@/lib/bossMan/jobStorage";
import {
  loadEmployeeDayAvailability,
  loadScheduleAssignments,
} from "@/lib/bossMan/scheduling/scheduleStorage";
import { dayKeyFromDate, startOfToday } from "@/lib/bossMan/scheduling/dateUtils";
import { listEmployees } from "@/lib/employees/employeeStorage";
import { normalizeEmployeeRole } from "@/lib/employees/permissions";

import { getEmergencyEmployeeIdsForDay } from "./dispatchStorage";
import { resolveEmployeeDispatchStatus } from "./dispatchStatus";

export type CrewDashboardStats = {
  employeeCount: number;
  activeJobCount: number;
  availableTechCount: number;
  dispatchedCount: number;
  emergencyCallCount: number;
};

export async function loadCrewDashboardStats(): Promise<CrewDashboardStats> {
  const dayKey = dayKeyFromDate(startOfToday());
  const [employees, jobs, assignments, availability, emergencyIds] = await Promise.all([
    listEmployees("current"),
    loadBossJobs(),
    loadScheduleAssignments(),
    loadEmployeeDayAvailability(),
    getEmergencyEmployeeIdsForDay(dayKey),
  ]);

  const activeJobs = jobs.filter(isBossJobActive);
  const todayAssignments = assignments.filter(
    (a) => a.date === dayKey && a.status !== "Cancelled",
  );

  let availableTechCount = 0;
  for (const emp of employees) {
    const status = resolveEmployeeDispatchStatus({
      employeeId: emp.id,
      dayKey,
      assignments,
      availability,
      emergencyIds,
    });
    if (status === "available" && normalizeEmployeeRole(emp.role) === "technician") {
      availableTechCount += 1;
    }
  }

  const dispatchedCount = todayAssignments.filter(
    (a) => a.status === "Sent" || a.status === "In Progress",
  ).length;

  const emergencyCallCount =
    todayAssignments.filter((a) => a.priority === "urgent").length + emergencyIds.size;

  return {
    employeeCount: employees.length,
    activeJobCount: activeJobs.length,
    availableTechCount,
    dispatchedCount,
    emergencyCallCount,
  };
}
