export type CloudRole = "boss" | "employee";

export type EmployeePermissions = {
  billing?: boolean;
  estimates?: boolean;
  invoices?: boolean;
  company_financials?: boolean;
  admin_settings?: boolean;
  [key: string]: boolean | undefined;
};

export type CloudCompany = {
  id: string;
  name: string;
  bossDeviceId: string;
  bossToken: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudUser = {
  id: string;
  companyId: string;
  roleId: CloudRole;
  displayName: string;
  phone: string;
  email: string;
  authToken: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudEmployee = {
  id: string;
  companyId: string;
  userId: string | null;
  localEmployeeId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  permissions: EmployeePermissions;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudInvite = {
  id: string;
  companyId: string;
  code: string;
  phone: string;
  email: string;
  employeeId: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
  createdAt: string;
};

export type CloudMessage = {
  id: string;
  companyId: string;
  channelType: "team" | "dm" | "job";
  channelId: string;
  senderUserId: string | null;
  body: string;
  createdAt: string;
};

export type CloudJobAssignment = {
  id: string;
  companyId: string;
  jobId: string;
  employeeId: string;
  assignedAt: string;
};

export type CloudNotification = {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};
