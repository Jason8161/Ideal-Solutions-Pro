import { loadActiveBossJobs } from "@/lib/bossMan/jobStorage";
import type { BossJob } from "@/lib/bossMan/types";
import { getAssignedLocalJobIds } from "@/lib/cloud/jobAssignments";
import { isEmployeeSessionActive } from "@/lib/employeeSession";

/**
 * Active jobs visible to the current user.
 * Employees with cloud assignments only see matching local job ids; otherwise all active jobs (offline).
 */
export async function loadJobsForCurrentUser(): Promise<BossJob[]> {
  const jobs = await loadActiveBossJobs();
  if (!(await isEmployeeSessionActive())) return jobs;
  const assigned = await getAssignedLocalJobIds();
  if (assigned.size === 0) return jobs;
  const filtered = jobs.filter((j) => assigned.has(j.id));
  return filtered.length > 0 ? filtered : jobs;
}
