export type PayType = "hourly" | "salary" | "day_rate" | "subcontractor";

export type EmployeeStatus = "current" | "previous";

export type EmployeeRole = "admin" | "office" | "foreman" | "technician";

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: "Admin",
  office: "Office",
  foreman: "Foreman",
  technician: "Technician",
};

export type CrewDispatchStatus = "available" | "assigned" | "off_duty" | "emergency";

export const CREW_DISPATCH_STATUS_LABELS: Record<CrewDispatchStatus, string> = {
  available: "Available",
  assigned: "Assigned",
  off_duty: "Off Duty",
  emergency: "Emergency",
};

export type EmployeeInviteStatus = "none" | "pending" | "sent" | "accepted";

export const EMPLOYEE_INVITE_STATUS_LABELS: Record<EmployeeInviteStatus, string> = {
  none: "Not invited",
  pending: "Pending",
  sent: "Invite sent",
  accepted: "Accepted",
};

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  jobTitle?: string;
  payRate?: string;
  payType: PayType;
  /** Hire / start date (YYYY-MM-DD). */
  startDate?: string;
  status: EmployeeStatus;
  notes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  /** App role for permissions and dispatch views. */
  role?: EmployeeRole;
  /** Profile photo URI (local). */
  photoUri?: string;
  certifications?: string;
  licenseNumber?: string;
  vehicleInfo?: string;
  skillLevel?: string;
  /** Cloud-ready external id when synced. */
  cloudEmployeeId?: string;
  inviteStatus?: EmployeeInviteStatus;
  /** Stub until cloud auth syncs login timestamps. */
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeInput = Omit<Employee, "id" | "createdAt" | "updatedAt">;

export type EmployeeSortKey = "name" | "pay_rate" | "start_date";

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  hourly: "Hourly",
  salary: "Salary",
  day_rate: "Day rate",
  subcontractor: "Subcontractor",
};
