import type { ClockLocation, TimeEntry } from "@/lib/bossMan/timeTrackingTypes";
import {
  performVerifiedClockIn,
  performVerifiedClockOut,
} from "@/lib/clockVerification/clockService";

export type EmployeeClockResult = {
  entry: TimeEntry;
  locationCaptured: boolean;
  location?: ClockLocation;
};

/** Employee self clock-in with GPS verification queue + owner alerts. */
export async function employeeSelfClockIn(
  employeeId: string,
  jobId?: string,
): Promise<EmployeeClockResult> {
  const result = await performVerifiedClockIn({ employeeId, jobsiteId: jobId });
  return {
    entry: result.timeEntry,
    locationCaptured: Boolean(result.location),
    location: result.location,
  };
}

/** Employee self clock-out with GPS verification queue + owner alerts. */
export async function employeeSelfClockOut(employeeId: string): Promise<EmployeeClockResult> {
  const result = await performVerifiedClockOut({ employeeId });
  return {
    entry: result.timeEntry,
    locationCaptured: Boolean(result.location),
    location: result.location,
  };
}
