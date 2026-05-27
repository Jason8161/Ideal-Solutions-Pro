import { employeeDisplayName, listEmployees } from "@/lib/employees/employeeStorage";
import { loadBossJobs } from "@/lib/bossMan/jobStorage";
import { loadTimeEntries } from "@/lib/bossMan/timeTrackingStorage";
import { entryDurationMs } from "@/lib/bossMan/timeTrackingUtils";

import { loadClockEventHistory } from "./clockEventStorage";
import type { ClockEvent, PayrollClockEventExport } from "./types";

function jobLabel(jobId: string | undefined, jobMap: Map<string, { jobName: string; customerName: string }>): string | undefined {
  if (!jobId) return undefined;
  const job = jobMap.get(jobId);
  if (!job) return "Job";
  return job.jobName.trim() || job.customerName.trim() || "Job";
}

/** Build payroll-ready export rows from verification events (QuickBooks stub included). */
export async function buildPayrollClockEventExport(): Promise<PayrollClockEventExport[]> {
  const [events, employees, jobs, entries] = await Promise.all([
    loadClockEventHistory(),
    listEmployees("current"),
    loadBossJobs(),
    loadTimeEntries(),
  ]);

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const entryMap = new Map(entries.map((e) => [e.id, e]));

  return events.map((event) => {
    const emp = empMap.get(event.employeeId);
    const name = emp ? employeeDisplayName(emp) : "Employee";
    const linked = event.timeEntryId ? entryMap.get(event.timeEntryId) : undefined;
    const hours =
      event.shiftDurationMs != null
        ? event.shiftDurationMs / 3_600_000
        : linked
          ? entryDurationMs(linked) / 3_600_000
          : undefined;

    return toExportRow(event, name, hours, jobLabel(event.jobsiteId, jobMap));
  });
}

function toExportRow(
  event: ClockEvent,
  employeeName: string,
  hours: number | undefined,
  jobLabelValue: string | undefined,
): PayrollClockEventExport {
  return {
    employeeId: event.employeeId,
    employeeName,
    kind: event.kind,
    timestamp: event.timestamp,
    hours,
    jobId: event.jobsiteId,
    jobLabel: jobLabelValue,
    verificationStatus: event.jobsiteVerification?.status,
    gpsRecorded: Boolean(event.location),
    quickBooksTimeActivityStub: {
      provider: "quickbooks",
      note: "QuickBooks Time export not wired — use CSV payroll export for now.",
    },
  };
}
