export type TimeEntrySource = "clock" | "manual";

/** GPS snapshot at clock-in or clock-out (optional if permission denied). */
export type ClockLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  capturedAt: string;
};

export type TimeEntry = {
  id: string;
  employeeId: string;
  /** Boss Man job id when time is tied to a job. */
  jobId?: string;
  clockIn: string;
  clockOut?: string;
  clockInLocation?: ClockLocation;
  clockOutLocation?: ClockLocation;
  notes?: string;
  source: TimeEntrySource;
  createdAt: string;
  updatedAt: string;
};

export type TimeClockEventKind = "clock_in" | "clock_out";

/** Pending owner alert when an employee clocks on this device (AsyncStorage queue). */
export type OwnerTimeClockAlert = {
  id: string;
  kind: TimeClockEventKind;
  employeeId: string;
  employeeName: string;
  entryId: string;
  at: string;
  location?: ClockLocation;
  read: boolean;
  createdAt: string;
};

export type PayPeriodPreset = "this_week" | "last_week" | "last_14_days";

export type PayrollJobBreakdown = {
  jobId: string;
  jobLabel: string;
  hours: number;
};

export type PayrollEmployeeRow = {
  employeeId: string;
  employeeName: string;
  payType: import("@/lib/employees/types").PayType;
  payRate: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  grossPay: number | null;
  grossPayNote?: string;
  entryCount: number;
  byJob: PayrollJobBreakdown[];
};

export type PayrollSummary = {
  periodStart: string;
  periodEnd: string;
  label: string;
  rows: PayrollEmployeeRow[];
  totalHours: number;
  totalGross: number | null;
};
