import type { ClockLocation } from "@/lib/bossMan/timeTrackingTypes";

export type ClockEventKind = "clock_in" | "clock_out" | "jobsite_check_in";

export type ClockEventSyncStatus = "pending_sync" | "synced" | "failed";

export type JobsiteVerificationStatus =
  | "verified"
  | "nearby"
  | "too_far"
  | "no_jobsite"
  | "no_gps"
  | "geofence_blocked"
  | "supervisor_override";

export type JobCompletionStatus = "completed" | "in_progress" | "needs_return";

export type JobsiteVerification = {
  status: JobsiteVerificationStatus;
  jobsiteId?: string;
  jobsiteName?: string;
  jobsiteAddress?: string;
  distanceFeet?: number;
  geofenceLimitFeet?: number;
  withinGeofence?: boolean;
};

export type ClockEventPhoto = {
  localUri: string;
  kind: "selfie" | "truck" | "jobsite";
  capturedAt: string;
};

/** Rich verification record — one per punch or manual jobsite check-in. */
export type ClockEvent = {
  id: string;
  kind: ClockEventKind;
  employeeId: string;
  deviceId: string;
  timestamp: string;
  location?: ClockLocation;
  jobsiteId?: string;
  jobsiteName?: string;
  jobsiteVerification?: JobsiteVerification;
  /** Linked Boss Man time entry when applicable. */
  timeEntryId?: string;
  shiftDurationMs?: number;
  notes?: string;
  jobCompletionStatus?: JobCompletionStatus;
  photo?: ClockEventPhoto;
  syncStatus: ClockEventSyncStatus;
  syncedAt?: string;
  serverReceivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClockVerificationPreferences = {
  gpsVerificationEnabled: boolean;
  geofencingEnabled: boolean;
  geofenceDistanceFeet: number;
  photoVerificationEnabled: boolean;
  offlineClockInsAllowed: boolean;
  requireAssignedJobsite: boolean;
  supervisorOverrideAllowed: boolean;
  /** Minimum seconds between punches for same employee (debounce). */
  punchDebounceSeconds: number;
};

export const DEFAULT_CLOCK_VERIFICATION_PREFERENCES: ClockVerificationPreferences = {
  gpsVerificationEnabled: true,
  geofencingEnabled: false,
  geofenceDistanceFeet: 500,
  photoVerificationEnabled: false,
  offlineClockInsAllowed: true,
  requireAssignedJobsite: false,
  supervisorOverrideAllowed: true,
  punchDebounceSeconds: 30,
};

/** Payload sent to pricing-backend batch sync. */
export type ClockEventSyncPayload = {
  localEventId: string;
  kind: ClockEventKind;
  localEmployeeId: string;
  localJobId?: string;
  deviceTimestamp: string;
  deviceId: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  accuracy?: number;
  jobsiteVerification?: JobsiteVerification;
  shiftDurationMs?: number;
  notes?: string;
  jobCompletionStatus?: JobCompletionStatus;
  timeEntryId?: string;
  photoBase64?: string;
  photoKind?: ClockEventPhoto["kind"];
};

export type ClockEventSyncBatchResult = {
  synced: string[];
  failed: { localEventId: string; error: string }[];
};

/** Future payroll / QuickBooks export shape (stub). */
export type PayrollClockEventExport = {
  employeeId: string;
  employeeName: string;
  kind: ClockEventKind;
  timestamp: string;
  hours?: number;
  jobId?: string;
  jobLabel?: string;
  verificationStatus?: JobsiteVerificationStatus;
  gpsRecorded: boolean;
  quickBooksTimeActivityStub?: {
    provider: "quickbooks";
    note: string;
  };
};
