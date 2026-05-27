export type EmployeeAvailabilityStatus =
  | "available"
  | "unavailable"
  | "off"
  | "sick"
  | "vacation";

export const EMPLOYEE_AVAILABILITY_LABELS: Record<EmployeeAvailabilityStatus, string> = {
  available: "Available",
  unavailable: "Unavailable",
  off: "Off",
  sick: "Sick",
  vacation: "Vacation",
};

export type EmployeeDayAvailability = {
  employeeId: string;
  /** Local calendar day YYYY-MM-DD */
  date: string;
  status: EmployeeAvailabilityStatus;
  updatedAt: string;
};

export type ScheduleAssignmentStatus =
  | "Scheduled"
  | "Sent"
  | "In Progress"
  | "Completed"
  | "Rescheduled"
  | "Cancelled";

export const SCHEDULE_ASSIGNMENT_STATUSES: readonly ScheduleAssignmentStatus[] = [
  "Scheduled",
  "Sent",
  "In Progress",
  "Completed",
  "Rescheduled",
  "Cancelled",
] as const;

export type ScheduleAssignmentPriority = "normal" | "high" | "urgent";

export const SCHEDULE_PRIORITY_LABELS: Record<ScheduleAssignmentPriority, string> = {
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export type ScheduleAssignment = {
  id: string;
  /** Cloud-ready external id */
  assignmentId?: string;
  companyId?: string;
  /** Local calendar day YYYY-MM-DD */
  date: string;
  /** HH:mm (24h) */
  startTime: string;
  /** HH:mm — optional when durationMinutes set */
  endTime?: string;
  durationMinutes?: number;
  jobId: string;
  employeeIds: string[];
  notes?: string;
  materialsNotes?: string;
  priority: ScheduleAssignmentPriority;
  status: ScheduleAssignmentStatus;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleConflictCode =
  | "employee_double_booked"
  | "job_no_employees"
  | "outside_window"
  | "employee_unavailable"
  | "crew_understaffed";

export type ScheduleConflict = {
  code: ScheduleConflictCode;
  message: string;
  employeeId?: string;
  assignmentId?: string;
};
