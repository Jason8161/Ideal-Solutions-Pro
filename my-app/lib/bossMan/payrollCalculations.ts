import { employeeDisplayName, listEmployees } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import { getBossJobById } from "@/lib/bossMan/jobStorage";
import type { PayrollEmployeeRow, PayrollSummary, PayPeriodPreset, TimeEntry } from "@/lib/bossMan/timeTrackingTypes";
import {
  entryDurationMs,
  entryOverlapsPeriod,
  formatHours,
  isoWeekKey,
  msToHours,
  parsePayRateString,
  periodForPreset,
} from "@/lib/bossMan/timeTrackingUtils";
import { loadTimeEntries } from "@/lib/bossMan/timeTrackingStorage";

async function jobLabel(jobId: string): Promise<string> {
  const job = await getBossJobById(jobId);
  if (!job) return "Unknown job";
  const name = job.jobName.trim() || job.customerName.trim();
  return name || "Job";
}

function computeGrossPay(
  employee: Employee,
  totalHours: number,
  regularHours: number,
  overtimeHours: number,
): { gross: number | null; note?: string } {
  const rate = parsePayRateString(employee.payRate);

  switch (employee.payType) {
    case "hourly": {
      const gross = regularHours * rate + overtimeHours * rate * 1.5;
      return { gross };
    }
    case "day_rate": {
      return { gross: null, note: "Day rate — review days worked in time log" };
    }
    case "salary": {
      return { gross: null, note: "Salary — hours tracked for jobs; pay from your payroll system" };
    }
    case "subcontractor": {
      const gross = totalHours * rate;
      return { gross, note: rate > 0 ? undefined : "Set pay rate on employee" };
    }
    default:
      return { gross: null };
  }
}

function hoursForEmployeeInPeriod(
  employeeId: string,
  entries: TimeEntry[],
  periodStart: Date,
  periodEnd: Date,
): { totalMs: number; byJobMs: Map<string, number>; entryCount: number } {
  let totalMs = 0;
  let entryCount = 0;
  const byJobMs = new Map<string, number>();

  for (const entry of entries) {
    if (entry.employeeId !== employeeId) continue;
    if (!entryOverlapsPeriod(entry, periodStart, periodEnd)) continue;
    const ms = entryDurationMs(entry, periodEnd.getTime());
    totalMs += ms;
    entryCount += 1;
    if (entry.jobId) {
      byJobMs.set(entry.jobId, (byJobMs.get(entry.jobId) ?? 0) + ms);
    }
  }

  return { totalMs, byJobMs, entryCount };
}

function weeklyRegularAndOvertime(
  employeeId: string,
  entries: TimeEntry[],
  periodStart: Date,
  periodEnd: Date,
): { regular: number; overtime: number; total: number } {
  const employeeEntries = entries.filter(
    (e) => e.employeeId === employeeId && entryOverlapsPeriod(e, periodStart, periodEnd),
  );

  const weekBuckets = new Map<string, number>();
  for (const entry of employeeEntries) {
    const key = isoWeekKey(entry.clockIn);
    weekBuckets.set(key, (weekBuckets.get(key) ?? 0) + entryDurationMs(entry, periodEnd.getTime()));
  }

  let regularMs = 0;
  let overtimeMs = 0;
  let totalMs = 0;

  for (const ms of weekBuckets.values()) {
    totalMs += ms;
    const weekHours = msToHours(ms);
    const regH = Math.min(weekHours, 40);
    const otH = Math.max(0, weekHours - 40);
    regularMs += regH * 3_600_000;
    overtimeMs += otH * 3_600_000;
  }

  return {
    regular: msToHours(regularMs),
    overtime: msToHours(overtimeMs),
    total: msToHours(totalMs),
  };
}

export async function buildPayrollSummary(preset: PayPeriodPreset): Promise<PayrollSummary> {
  const { start, end, label } = periodForPreset(preset);
  const [entries, employees] = await Promise.all([loadTimeEntries(), listEmployees("current")]);

  const rows: PayrollEmployeeRow[] = [];

  for (const employee of employees) {
    const { totalMs, byJobMs, entryCount } = hoursForEmployeeInPeriod(employee.id, entries, start, end);
    if (entryCount === 0) continue;

    const weekly =
      employee.payType === "hourly"
        ? weeklyRegularAndOvertime(employee.id, entries, start, end)
        : {
            total: msToHours(totalMs),
            regular: msToHours(totalMs),
            overtime: 0,
          };

    const { gross, note } = computeGrossPay(
      employee,
      weekly.total,
      weekly.regular,
      weekly.overtime,
    );

    const byJob: PayrollEmployeeRow["byJob"] = [];
    for (const [jobId, ms] of byJobMs.entries()) {
      byJob.push({
        jobId,
        jobLabel: await jobLabel(jobId),
        hours: msToHours(ms),
      });
    }
    byJob.sort((a, b) => b.hours - a.hours);

    rows.push({
      employeeId: employee.id,
      employeeName: employeeDisplayName(employee),
      payType: employee.payType,
      payRate: parsePayRateString(employee.payRate),
      totalHours: weekly.total,
      regularHours: weekly.regular,
      overtimeHours: weekly.overtime,
      grossPay: gross,
      grossPayNote: note,
      entryCount,
      byJob,
    });
  }

  rows.sort((a, b) => b.totalHours - a.totalHours);

  const totalHours = rows.reduce((sum, r) => sum + r.totalHours, 0);
  const grossRows = rows.filter((r) => r.grossPay != null);
  const totalGross =
    grossRows.length > 0 ? grossRows.reduce((sum, r) => sum + (r.grossPay ?? 0), 0) : null;

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    label,
    rows,
    totalHours,
    totalGross,
  };
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function payrollHoursLabel(row: PayrollEmployeeRow): string {
  if (row.overtimeHours > 0) {
    return `${formatHours(row.totalHours)}h (${formatHours(row.regularHours)} reg + ${formatHours(row.overtimeHours)} OT)`;
  }
  return `${formatHours(row.totalHours)}h`;
}
