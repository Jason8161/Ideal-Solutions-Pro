export type WorkspaceRoleId = "boss" | "employee";

export type EmployeePermissions = {
  billing?: boolean;
  estimates?: boolean;
  invoices?: boolean;
  company_financials?: boolean;
  admin_settings?: boolean;
  [key: string]: boolean | undefined;
};

export type CompanyRecord = {
  id: string;
  name: string;
  bossDeviceId: string;
  bossToken: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = {
  id: string;
  companyId: string;
  roleId: WorkspaceRoleId;
  displayName: string;
  phone: string;
  email: string;
  authToken: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeRecord = {
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

export type InviteRecord = {
  id: string;
  companyId: string;
  code: string;
  phone: string;
  email: string;
  invitedByUserId: string | null;
  employeeId: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedByUserId: string | null;
  createdAt: string;
};

export type JobRecord = {
  id: string;
  companyId: string;
  localJobId: string;
  title: string;
  customerName: string;
  address: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type JobAssignmentRecord = {
  id: string;
  companyId: string;
  jobId: string;
  employeeId: string;
  assignedAt: string;
};

export type MessageChannelType = "team" | "dm" | "job";

export type MessageRecord = {
  id: string;
  companyId: string;
  channelType: MessageChannelType;
  channelId: string;
  senderUserId: string | null;
  body: string;
  createdAt: string;
};

export type NotificationRecord = {
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

export type WorkspaceJsonSnapshot = {
  companies: CompanyRecord[];
  users: UserRecord[];
  employees: EmployeeRecord[];
  invites: InviteRecord[];
  jobs: JobRecord[];
  jobAssignments: JobAssignmentRecord[];
  messages: MessageRecord[];
  notifications: NotificationRecord[];
  pushTokens: { id: string; userId: string; expoPushToken: string; platform: string; createdAt: string; updatedAt: string }[];
};

export type AuthContext = {
  user: UserRecord;
  company: CompanyRecord;
  employee: EmployeeRecord | null;
};

export type CreateInviteInput = {
  phone?: string;
  email?: string;
  employeeId?: string;
  localEmployeeId?: string;
  firstName?: string;
  lastName?: string;
  expiresInDays?: number;
};

export type RedeemInviteInput = {
  code: string;
  displayName?: string;
  phone?: string;
  email?: string;
  deviceId?: string;
};
