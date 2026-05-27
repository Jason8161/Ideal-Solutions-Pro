import { enqueueOwnerTimeClockAlert } from "@/lib/bossMan/ownerTimeClockAlerts";
import { scheduleOwnerTimeClockLocalNotification } from "@/lib/bossMan/timeClockNotifications";
import {
  clockIn,
  clockOut,
  getActiveEntryForEmployee,
} from "@/lib/bossMan/timeTrackingStorage";
import type { ClockLocation, TimeEntry } from "@/lib/bossMan/timeTrackingTypes";
import { entryDurationMs } from "@/lib/bossMan/timeTrackingUtils";
import { employeeDisplayName, getEmployee } from "@/lib/employees/employeeStorage";
import { isEmployeeSessionActive } from "@/lib/employeeSession";
import { requestNotificationPermission } from "@/lib/appointmentNotifications";

import { enqueueClockEvent, getLastClockEventForEmployee } from "./clockEventStorage";
import { getOrCreateDeviceId } from "./deviceId";
import { captureGpsOnce } from "./gpsCapture";
import {
  canClockInWithVerification,
  verifyJobsiteProximity,
} from "./jobsiteVerification";
import { captureVerificationPhoto } from "./photoCapture";
import {
  isSupervisorOverrideActive,
  loadClockVerificationPreferences,
} from "./preferencesStorage";
import { probeNetworkOnline, scheduleClockEventSync } from "./syncService";
import type {
  ClockEvent,
  ClockEventPhoto,
  JobCompletionStatus,
  JobsiteVerification,
} from "./types";

export type VerifiedClockResult = {
  event: ClockEvent;
  timeEntry: TimeEntry;
  verification: JobsiteVerification;
  location?: ClockLocation;
  photo?: ClockEventPhoto;
  shiftDurationMs?: number;
};

async function resolveEmployeeName(employeeId: string): Promise<string> {
  const emp = await getEmployee(employeeId);
  return emp ? employeeDisplayName(emp) : "Employee";
}

async function notifyOwner(input: {
  kind: "clock_in" | "clock_out";
  employeeId: string;
  employeeName: string;
  entry: TimeEntry;
  at: string;
  location?: ClockLocation;
}): Promise<void> {
  const alert = await enqueueOwnerTimeClockAlert({
    kind: input.kind,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    entryId: input.entry.id,
    at: input.at,
    location: input.location,
  });
  if (!(await isEmployeeSessionActive())) {
    await scheduleOwnerTimeClockLocalNotification(alert);
  }
}

async function assertDebounce(employeeId: string, debounceSeconds: number): Promise<void> {
  const last = await getLastClockEventForEmployee(employeeId);
  if (!last) return;
  const elapsed = Date.now() - new Date(last.timestamp).getTime();
  if (elapsed < debounceSeconds * 1000) {
    throw new Error("Please wait a moment before punching again.");
  }
}

export type ClockInInput = {
  employeeId: string;
  jobsiteId?: string | null;
  supervisorOverride?: boolean;
};

export async function performVerifiedClockIn(input: ClockInInput): Promise<VerifiedClockResult> {
  await requestNotificationPermission();
  const prefs = await loadClockVerificationPreferences();
  await assertDebounce(input.employeeId, prefs.punchDebounceSeconds);

  const active = await getActiveEntryForEmployee(input.employeeId);
  if (active) {
    throw new Error("You are already clocked in.");
  }

  const online = await probeNetworkOnline();
  const supervisorOverride =
    input.supervisorOverride ?? (await isSupervisorOverrideActive());

  const gps = await captureGpsOnce(prefs);
  const location = gps.ok ? gps.location : undefined;

  const verification = await verifyJobsiteProximity({
    jobsiteId: input.jobsiteId,
    location,
    prefs,
    supervisorOverride,
  });

  const gate = canClockInWithVerification(verification, prefs, online);
  if (!gate.allowed) {
    throw new Error(gate.reason ?? "Clock-in blocked.");
  }

  let photo: ClockEventPhoto | undefined;
  if (prefs.photoVerificationEnabled) {
    const shot = await captureVerificationPhoto("selfie");
    if (shot.ok) photo = shot.photo;
  }

  const entry = await clockIn(input.employeeId, {
    jobId: input.jobsiteId ?? undefined,
    clockInLocation: location,
  });

  const deviceId = await getOrCreateDeviceId();
  const timestamp = entry.clockIn;
  const event = await enqueueClockEvent({
    kind: "clock_in",
    employeeId: input.employeeId,
    deviceId,
    timestamp,
    location,
    jobsiteId: input.jobsiteId ?? undefined,
    jobsiteName: verification.jobsiteName,
    jobsiteVerification: verification,
    timeEntryId: entry.id,
    photo,
  });

  const name = await resolveEmployeeName(input.employeeId);
  await notifyOwner({
    kind: "clock_in",
    employeeId: input.employeeId,
    employeeName: name,
    entry,
    at: timestamp,
    location,
  });

  scheduleClockEventSync();

  return { event, timeEntry: entry, verification, location, photo };
}

export type ClockOutInput = {
  employeeId: string;
  notes?: string;
  jobCompletionStatus?: JobCompletionStatus;
};

export async function performVerifiedClockOut(input: ClockOutInput): Promise<VerifiedClockResult> {
  await requestNotificationPermission();
  const prefs = await loadClockVerificationPreferences();
  await assertDebounce(input.employeeId, prefs.punchDebounceSeconds);

  const active = await getActiveEntryForEmployee(input.employeeId);
  if (!active) {
    throw new Error("You are not clocked in.");
  }

  const gps = await captureGpsOnce(prefs);
  const location = gps.ok ? gps.location : undefined;

  let photo: ClockEventPhoto | undefined;
  if (prefs.photoVerificationEnabled) {
    const shot = await captureVerificationPhoto("jobsite");
    if (shot.ok) photo = shot.photo;
  }

  const entry = await clockOut(active.id, { clockOutLocation: location });
  const shiftDurationMs = entryDurationMs(entry);
  const timestamp = entry.clockOut ?? new Date().toISOString();

  const verification = await verifyJobsiteProximity({
    jobsiteId: active.jobId,
    location,
    prefs,
  });

  const deviceId = await getOrCreateDeviceId();
  const event = await enqueueClockEvent({
    kind: "clock_out",
    employeeId: input.employeeId,
    deviceId,
    timestamp,
    location,
    jobsiteId: active.jobId,
    jobsiteName: verification.jobsiteName,
    jobsiteVerification: verification,
    timeEntryId: entry.id,
    shiftDurationMs,
    notes: input.notes?.trim() || undefined,
    jobCompletionStatus: input.jobCompletionStatus,
    photo,
  });

  const name = await resolveEmployeeName(input.employeeId);
  await notifyOwner({
    kind: "clock_out",
    employeeId: input.employeeId,
    employeeName: name,
    entry,
    at: timestamp,
    location,
  });

  scheduleClockEventSync();

  return { event, timeEntry: entry, verification, location, photo, shiftDurationMs };
}

/** Optional manual jobsite check-in without starting a shift. */
export async function performJobsiteCheckIn(input: {
  employeeId: string;
  jobsiteId: string;
}): Promise<{ event: ClockEvent; verification: JobsiteVerification; location?: ClockLocation }> {
  const prefs = await loadClockVerificationPreferences();
  const gps = await captureGpsOnce(prefs);
  const location = gps.ok ? gps.location : undefined;
  const verification = await verifyJobsiteProximity({
    jobsiteId: input.jobsiteId,
    location,
    prefs,
  });

  const deviceId = await getOrCreateDeviceId();
  const timestamp = new Date().toISOString();
  const event = await enqueueClockEvent({
    kind: "jobsite_check_in",
    employeeId: input.employeeId,
    deviceId,
    timestamp,
    location,
    jobsiteId: input.jobsiteId,
    jobsiteName: verification.jobsiteName,
    jobsiteVerification: verification,
  });

  scheduleClockEventSync();
  return { event, verification, location };
}
