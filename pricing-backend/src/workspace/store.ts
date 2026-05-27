import { isDatabaseReachable, pool } from "../db/pool";
import { readWorkspaceJson, writeWorkspaceJson } from "./jsonStore";
import { newAuthToken, newId, newInviteCode } from "./tokens";
import type {
  AuthContext,
  CompanyRecord,
  CreateInviteInput,
  EmployeeRecord,
  InviteRecord,
  JobAssignmentRecord,
  MessageChannelType,
  MessageRecord,
  NotificationRecord,
  RedeemInviteInput,
  UserRecord,
  WorkspaceJsonSnapshot,
} from "./types";

const INVITE_TTL_DAYS_DEFAULT = 30;

function nowIso(): string {
  return new Date().toISOString();
}

function bearerToken(header: string | undefined): string {
  if (!header) return "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return (m?.[1] ?? header).trim();
}

async function usePg(): Promise<boolean> {
  return isDatabaseReachable();
}

// ——— JSON implementations ———

async function jsonFindAuth(token: string): Promise<AuthContext | null> {
  const snap = await readWorkspaceJson();
  const user = snap.users.find((u) => u.authToken === token);
  if (!user) {
    const company = snap.companies.find((c) => c.bossToken === token);
    if (!company) return null;
    const bossUser = snap.users.find((u) => u.companyId === company.id && u.roleId === "boss");
    if (!bossUser) return null;
    const employee =
      snap.employees.find((e) => e.userId === bossUser.id && e.status === "active") ?? null;
    return { user: bossUser, company, employee };
  }
  const company = snap.companies.find((c) => c.id === user.companyId);
  if (!company) return null;
  const employee =
    user.roleId === "employee"
      ? snap.employees.find((e) => e.userId === user.id) ?? null
      : null;
  return { user, company, employee };
}

async function jsonUpsertCompany(
  bossDeviceId: string,
  name: string,
): Promise<{ company: CompanyRecord; bossUser: UserRecord; created: boolean }> {
  const snap = await readWorkspaceJson();
  const deviceId = bossDeviceId.trim();
  let company = snap.companies.find((c) => c.bossDeviceId === deviceId);
  let created = false;
  const ts = nowIso();
  if (!company) {
    created = true;
    company = {
      id: newId(),
      name: name.trim(),
      bossDeviceId: deviceId,
      bossToken: newAuthToken("boss"),
      createdAt: ts,
      updatedAt: ts,
    };
    snap.companies.push(company);
    const bossUser: UserRecord = {
      id: newId(),
      companyId: company.id,
      roleId: "boss",
      displayName: name.trim() || "Boss",
      phone: "",
      email: "",
      authToken: company.bossToken,
      deviceId,
      createdAt: ts,
      updatedAt: ts,
    };
    snap.users.push(bossUser);
    await writeWorkspaceJson(snap);
    return { company, bossUser, created };
  }
  company.name = name.trim() || company.name;
  company.updatedAt = ts;
  const bossUser =
    snap.users.find((u) => u.companyId === company!.id && u.roleId === "boss") ??
    ({
      id: newId(),
      companyId: company.id,
      roleId: "boss" as const,
      displayName: company.name,
      phone: "",
      email: "",
      authToken: company.bossToken,
      deviceId,
      createdAt: ts,
      updatedAt: ts,
    } satisfies UserRecord);
  if (!snap.users.some((u) => u.id === bossUser.id)) snap.users.push(bossUser);
  await writeWorkspaceJson(snap);
  return { company, bossUser, created: false };
}

async function jsonCreateInvite(
  auth: AuthContext,
  input: CreateInviteInput,
): Promise<InviteRecord> {
  const snap = await readWorkspaceJson();
  const ts = nowIso();
  let employeeId = input.employeeId?.trim() || null;
  if (!employeeId && input.localEmployeeId?.trim()) {
    let emp = snap.employees.find(
      (e) =>
        e.companyId === auth.company.id && e.localEmployeeId === input.localEmployeeId!.trim(),
    );
    if (!emp) {
      emp = {
        id: newId(),
        companyId: auth.company.id,
        userId: null,
        localEmployeeId: input.localEmployeeId.trim(),
        firstName: (input.firstName ?? "").trim(),
        lastName: (input.lastName ?? "").trim(),
        phone: (input.phone ?? "").trim(),
        email: (input.email ?? "").trim(),
        permissions: {},
        status: "active",
        createdAt: ts,
        updatedAt: ts,
      };
      snap.employees.push(emp);
      employeeId = emp.id;
    } else {
      employeeId = emp.id;
    }
  }
  const days = input.expiresInDays ?? INVITE_TTL_DAYS_DEFAULT;
  const expiresAt = new Date(Date.now() + days * 864e5).toISOString();
  let code = newInviteCode();
  while (snap.invites.some((i) => i.code === code)) code = newInviteCode();
  const invite: InviteRecord = {
    id: newId(),
    companyId: auth.company.id,
    code,
    phone: (input.phone ?? "").trim(),
    email: (input.email ?? "").trim(),
    invitedByUserId: auth.user.id,
    employeeId,
    expiresAt,
    redeemedAt: null,
    redeemedByUserId: null,
    createdAt: ts,
  };
  snap.invites.push(invite);
  await writeWorkspaceJson(snap);
  return invite;
}

async function jsonListInvites(companyId: string): Promise<InviteRecord[]> {
  const snap = await readWorkspaceJson();
  return snap.invites
    .filter((i) => i.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function jsonRedeemInvite(input: RedeemInviteInput): Promise<AuthContext> {
  const snap = await readWorkspaceJson();
  const code = input.code.trim().toUpperCase();
  const invite = snap.invites.find((i) => i.code === code);
  if (!invite) throw new Error("Invalid invite code.");
  if (invite.redeemedAt) throw new Error("This invite was already used.");
  if (invite.expiresAt && invite.expiresAt < nowIso()) throw new Error("This invite has expired.");
  const company = snap.companies.find((c) => c.id === invite.companyId);
  if (!company) throw new Error("Company not found.");

  const ts = nowIso();
  invite.redeemedAt = ts;

  let employee: EmployeeRecord | undefined =
    (invite.employeeId && snap.employees.find((e) => e.id === invite.employeeId)) || undefined;
  if (!employee) {
    employee = {
      id: newId(),
      companyId: company.id,
      userId: null,
      localEmployeeId: "",
      firstName: (input.displayName ?? "").split(" ")[0]?.trim() ?? "",
      lastName: (input.displayName ?? "").split(" ").slice(1).join(" ").trim(),
      phone: (input.phone ?? invite.phone).trim(),
      email: (input.email ?? invite.email).trim(),
      permissions: {},
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    };
    snap.employees.push(employee);
    invite.employeeId = employee.id;
  }

  const user: UserRecord = {
    id: newId(),
    companyId: company.id,
    roleId: "employee",
    displayName: (input.displayName ?? `${employee.firstName} ${employee.lastName}`).trim(),
    phone: (input.phone ?? employee.phone).trim(),
    email: (input.email ?? employee.email).trim(),
    authToken: newAuthToken("emp"),
    deviceId: (input.deviceId ?? "").trim(),
    createdAt: ts,
    updatedAt: ts,
  };
  snap.users.push(user);
  employee.userId = user.id;
  employee.updatedAt = ts;
  invite.redeemedByUserId = user.id;

  const note: NotificationRecord = {
    id: newId(),
    companyId: company.id,
    userId:
      snap.users.find((u) => u.companyId === company.id && u.roleId === "boss")?.id ?? user.id,
    type: "employee_joined",
    title: "Employee joined",
    body: `${user.displayName} joined via invite ${code}.`,
    data: { employeeId: employee.id, inviteCode: code },
    readAt: null,
    createdAt: ts,
  };
  snap.notifications.push(note);

  await writeWorkspaceJson(snap);
  return { user, company, employee };
}

async function jsonListEmployees(companyId: string): Promise<EmployeeRecord[]> {
  const snap = await readWorkspaceJson();
  return snap.employees.filter((e) => e.companyId === companyId);
}

async function jsonListMessages(
  companyId: string,
  channelType: MessageChannelType,
  channelId: string,
  since?: string,
): Promise<MessageRecord[]> {
  const snap = await readWorkspaceJson();
  return snap.messages
    .filter(
      (m) =>
        m.companyId === companyId &&
        m.channelType === channelType &&
        m.channelId === channelId &&
        (!since || m.createdAt > since),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function jsonCreateMessage(
  auth: AuthContext,
  channelType: MessageChannelType,
  channelId: string,
  body: string,
): Promise<MessageRecord> {
  const snap = await readWorkspaceJson();
  const msg: MessageRecord = {
    id: newId(),
    companyId: auth.company.id,
    channelType,
    channelId: channelId.trim(),
    senderUserId: auth.user.id,
    body: body.trim(),
    createdAt: nowIso(),
  };
  snap.messages.push(msg);
  await writeWorkspaceJson(snap);
  return msg;
}

async function jsonListAssignments(employeeId: string): Promise<JobAssignmentRecord[]> {
  const snap = await readWorkspaceJson();
  return snap.jobAssignments.filter((a) => a.employeeId === employeeId);
}

async function jsonUpsertAssignment(
  auth: AuthContext,
  jobId: string,
  employeeId: string,
): Promise<JobAssignmentRecord> {
  const snap = await readWorkspaceJson();
  const existing = snap.jobAssignments.find(
    (a) => a.jobId === jobId && a.employeeId === employeeId,
  );
  if (existing) return existing;
  const row: JobAssignmentRecord = {
    id: newId(),
    companyId: auth.company.id,
    jobId,
    employeeId,
    assignedAt: nowIso(),
  };
  snap.jobAssignments.push(row);
  await writeWorkspaceJson(snap);
  return row;
}

async function jsonListNotifications(userId: string): Promise<NotificationRecord[]> {
  const snap = await readWorkspaceJson();
  return snap.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function jsonRegisterPushToken(
  userId: string,
  expoPushToken: string,
  platform: string,
): Promise<void> {
  const snap = await readWorkspaceJson();
  const token = expoPushToken.trim();
  const idx = snap.pushTokens.findIndex((p) => p.userId === userId && p.expoPushToken === token);
  const ts = nowIso();
  if (idx >= 0) {
    snap.pushTokens[idx].updatedAt = ts;
    snap.pushTokens[idx].platform = platform;
  } else {
    snap.pushTokens.push({
      id: newId(),
      userId,
      expoPushToken: token,
      platform,
      createdAt: ts,
      updatedAt: ts,
    });
  }
  await writeWorkspaceJson(snap);
}

// ——— Postgres implementations (subset; JSON fallback on failure) ———

async function pgFindAuth(token: string): Promise<AuthContext | null> {
  const res = await pool.query(
    `SELECT u.id, u.company_id, u.role_id, u.display_name, u.phone, u.email, u.auth_token, u.device_id,
            u.created_at, u.updated_at,
            c.id AS c_id, c.name, c.boss_device_id, c.boss_token, c.created_at AS c_created, c.updated_at AS c_updated
     FROM users u
     JOIN companies c ON c.id = u.company_id
     WHERE u.auth_token = $1
     LIMIT 1`,
    [token],
  );
  if (res.rows[0]) {
    const r = res.rows[0];
    const user: UserRecord = {
      id: r.id,
      companyId: r.company_id,
      roleId: r.role_id,
      displayName: r.display_name,
      phone: r.phone ?? "",
      email: r.email ?? "",
      authToken: r.auth_token,
      deviceId: r.device_id ?? "",
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
    const company: CompanyRecord = {
      id: r.c_id,
      name: r.name,
      bossDeviceId: r.boss_device_id ?? "",
      bossToken: r.boss_token,
      createdAt: new Date(r.c_created).toISOString(),
      updatedAt: new Date(r.c_updated).toISOString(),
    };
    let employee: EmployeeRecord | null = null;
    if (user.roleId === "employee") {
      const er = await pool.query(`SELECT * FROM employees WHERE user_id = $1 LIMIT 1`, [user.id]);
      if (er.rows[0]) employee = mapEmployeeRow(er.rows[0]);
    }
    return { user, company, employee };
  }
  const cr = await pool.query(`SELECT * FROM companies WHERE boss_token = $1 LIMIT 1`, [token]);
  if (!cr.rows[0]) return null;
  const company = mapCompanyRow(cr.rows[0]);
  const ur = await pool.query(
    `SELECT * FROM users WHERE company_id = $1 AND role_id = 'boss' LIMIT 1`,
    [company.id],
  );
  if (!ur.rows[0]) return null;
  return { user: mapUserRow(ur.rows[0]), company, employee: null };
}

function mapCompanyRow(r: Record<string, unknown>): CompanyRecord {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    bossDeviceId: String(r.boss_device_id ?? ""),
    bossToken: String(r.boss_token),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function mapUserRow(r: Record<string, unknown>): UserRecord {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    roleId: r.role_id as UserRecord["roleId"],
    displayName: String(r.display_name ?? ""),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    authToken: String(r.auth_token),
    deviceId: String(r.device_id ?? ""),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function mapEmployeeRow(r: Record<string, unknown>): EmployeeRecord {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    userId: r.user_id ? String(r.user_id) : null,
    localEmployeeId: String(r.local_employee_id ?? ""),
    firstName: String(r.first_name ?? ""),
    lastName: String(r.last_name ?? ""),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    permissions: (r.permissions as EmployeeRecord["permissions"]) ?? {},
    status: String(r.status ?? "active"),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function mapInviteRow(r: Record<string, unknown>): InviteRecord {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    code: String(r.code),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    invitedByUserId: r.invited_by_user_id ? String(r.invited_by_user_id) : null,
    employeeId: r.employee_id ? String(r.employee_id) : null,
    expiresAt: r.expires_at ? new Date(r.expires_at as string).toISOString() : null,
    redeemedAt: r.redeemed_at ? new Date(r.redeemed_at as string).toISOString() : null,
    redeemedByUserId: r.redeemed_by_user_id ? String(r.redeemed_by_user_id) : null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

async function pgUpsertCompany(
  bossDeviceId: string,
  name: string,
): Promise<{ company: CompanyRecord; bossUser: UserRecord; created: boolean }> {
  const existing = await pool.query(`SELECT * FROM companies WHERE boss_device_id = $1 LIMIT 1`, [
    bossDeviceId.trim(),
  ]);
  if (existing.rows[0]) {
    const company = mapCompanyRow(existing.rows[0]);
    await pool.query(`UPDATE companies SET name = $2, updated_at = now() WHERE id = $1`, [
      company.id,
      name.trim() || company.name,
    ]);
    const ur = await pool.query(
      `SELECT * FROM users WHERE company_id = $1 AND role_id = 'boss' LIMIT 1`,
      [company.id],
    );
    return {
      company: { ...company, name: name.trim() || company.name, updatedAt: nowIso() },
      bossUser: mapUserRow(ur.rows[0]),
      created: false,
    };
  }
  const bossToken = newAuthToken("boss");
  const cr = await pool.query(
    `INSERT INTO companies (name, boss_device_id, boss_token) VALUES ($1, $2, $3) RETURNING *`,
    [name.trim(), bossDeviceId.trim(), bossToken],
  );
  const company = mapCompanyRow(cr.rows[0]);
  const ur = await pool.query(
    `INSERT INTO users (company_id, role_id, display_name, auth_token, device_id)
     VALUES ($1, 'boss', $2, $3, $4) RETURNING *`,
    [company.id, name.trim() || "Boss", bossToken, bossDeviceId.trim()],
  );
  return { company, bossUser: mapUserRow(ur.rows[0]), created: true };
}

async function pgCreateInvite(auth: AuthContext, input: CreateInviteInput): Promise<InviteRecord> {
  const ts = nowIso();
  let employeeId = input.employeeId?.trim() || null;
  if (!employeeId && input.localEmployeeId?.trim()) {
    const er = await pool.query(
      `SELECT id FROM employees WHERE company_id = $1 AND local_employee_id = $2 LIMIT 1`,
      [auth.company.id, input.localEmployeeId.trim()],
    );
    if (er.rows[0]) {
      employeeId = String(er.rows[0].id);
    } else {
      const ins = await pool.query(
        `INSERT INTO employees (company_id, local_employee_id, first_name, last_name, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          auth.company.id,
          input.localEmployeeId.trim(),
          (input.firstName ?? "").trim(),
          (input.lastName ?? "").trim(),
          (input.phone ?? "").trim(),
          (input.email ?? "").trim(),
        ],
      );
      employeeId = String(ins.rows[0].id);
    }
  }
  const days = input.expiresInDays ?? INVITE_TTL_DAYS_DEFAULT;
  const expiresAt = new Date(Date.now() + days * 864e5);
  let code = newInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const ir = await pool.query(
        `INSERT INTO invites (company_id, code, phone, email, invited_by_user_id, employee_id, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          auth.company.id,
          code,
          (input.phone ?? "").trim(),
          (input.email ?? "").trim(),
          auth.user.id,
          employeeId,
          expiresAt,
        ],
      );
      return mapInviteRow(ir.rows[0]);
    } catch {
      code = newInviteCode();
    }
  }
  throw new Error("Could not generate invite code.");
}

async function pgListInvites(companyId: string): Promise<InviteRecord[]> {
  const res = await pool.query(
    `SELECT * FROM invites WHERE company_id = $1 ORDER BY created_at DESC`,
    [companyId],
  );
  return res.rows.map(mapInviteRow);
}

async function pgRedeemInvite(input: RedeemInviteInput): Promise<AuthContext> {
  const code = input.code.trim().toUpperCase();
  const ir = await pool.query(`SELECT * FROM invites WHERE code = $1 LIMIT 1`, [code]);
  if (!ir.rows[0]) throw new Error("Invalid invite code.");
  const invite = mapInviteRow(ir.rows[0]);
  if (invite.redeemedAt) throw new Error("This invite was already used.");
  if (invite.expiresAt && invite.expiresAt < nowIso()) throw new Error("This invite has expired.");

  const cr = await pool.query(`SELECT * FROM companies WHERE id = $1`, [invite.companyId]);
  const company = mapCompanyRow(cr.rows[0]);
  const authToken = newAuthToken("emp");
  const displayName =
    (input.displayName ?? "").trim() ||
    [input.phone, input.email].filter(Boolean).join(" ") ||
    "Employee";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let employeeId = invite.employeeId;
    if (!employeeId) {
      const er = await client.query(
        `INSERT INTO employees (company_id, first_name, last_name, phone, email)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          company.id,
          displayName.split(" ")[0] ?? "",
          displayName.split(" ").slice(1).join(" "),
          (input.phone ?? invite.phone).trim(),
          (input.email ?? invite.email).trim(),
        ],
      );
      employeeId = String(er.rows[0].id);
    }
    const ur = await client.query(
      `INSERT INTO users (company_id, role_id, display_name, phone, email, auth_token, device_id)
       VALUES ($1, 'employee', $2, $3, $4, $5, $6) RETURNING *`,
      [
        company.id,
        displayName,
        (input.phone ?? invite.phone).trim(),
        (input.email ?? invite.email).trim(),
        authToken,
        (input.deviceId ?? "").trim(),
      ],
    );
    const user = mapUserRow(ur.rows[0]);
    await client.query(`UPDATE employees SET user_id = $2, updated_at = now() WHERE id = $1`, [
      employeeId,
      user.id,
    ]);
    await client.query(
      `UPDATE invites SET redeemed_at = now(), redeemed_by_user_id = $2 WHERE id = $1`,
      [invite.id, user.id],
    );
    const bossUr = await client.query(
      `SELECT id FROM users WHERE company_id = $1 AND role_id = 'boss' LIMIT 1`,
      [company.id],
    );
    if (bossUr.rows[0]) {
      await client.query(
        `INSERT INTO notifications (company_id, user_id, type, title, body, data)
         VALUES ($1, $2, 'employee_joined', 'Employee joined', $3, $4)`,
        [
          company.id,
          bossUr.rows[0].id,
          `${displayName} joined via invite ${code}.`,
          JSON.stringify({ employeeId, inviteCode: code }),
        ],
      );
    }
    await client.query("COMMIT");
    const er = await pool.query(`SELECT * FROM employees WHERE id = $1`, [employeeId]);
    return { user, company, employee: mapEmployeeRow(er.rows[0]) };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function pgListEmployees(companyId: string): Promise<EmployeeRecord[]> {
  const res = await pool.query(`SELECT * FROM employees WHERE company_id = $1`, [companyId]);
  return res.rows.map(mapEmployeeRow);
}

async function pgListMessages(
  companyId: string,
  channelType: MessageChannelType,
  channelId: string,
  since?: string,
): Promise<MessageRecord[]> {
  const res = await pool.query(
    `SELECT * FROM messages
     WHERE company_id = $1 AND channel_type = $2 AND channel_id = $3
       AND ($4::timestamptz IS NULL OR created_at > $4::timestamptz)
     ORDER BY created_at ASC`,
    [companyId, channelType, channelId, since ?? null],
  );
  return res.rows.map((r) => ({
    id: String(r.id),
    companyId: String(r.company_id),
    channelType: r.channel_type as MessageChannelType,
    channelId: String(r.channel_id ?? ""),
    senderUserId: r.sender_user_id ? String(r.sender_user_id) : null,
    body: String(r.body),
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

async function pgCreateMessage(
  auth: AuthContext,
  channelType: MessageChannelType,
  channelId: string,
  body: string,
): Promise<MessageRecord> {
  const res = await pool.query(
    `INSERT INTO messages (company_id, channel_type, channel_id, sender_user_id, body)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [auth.company.id, channelType, channelId.trim(), auth.user.id, body.trim()],
  );
  const r = res.rows[0];
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    channelType: r.channel_type,
    channelId: String(r.channel_id ?? ""),
    senderUserId: r.sender_user_id ? String(r.sender_user_id) : null,
    body: String(r.body),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

async function pgListAssignments(employeeId: string): Promise<JobAssignmentRecord[]> {
  const res = await pool.query(`SELECT * FROM job_assignments WHERE employee_id = $1`, [
    employeeId,
  ]);
  return res.rows.map((r) => ({
    id: String(r.id),
    companyId: String(r.company_id),
    jobId: String(r.job_id),
    employeeId: String(r.employee_id),
    assignedAt: new Date(r.assigned_at).toISOString(),
  }));
}

async function pgUpsertAssignment(
  auth: AuthContext,
  jobId: string,
  employeeId: string,
): Promise<JobAssignmentRecord> {
  const res = await pool.query(
    `INSERT INTO job_assignments (company_id, job_id, employee_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (job_id, employee_id) DO UPDATE SET assigned_at = job_assignments.assigned_at
     RETURNING *`,
    [auth.company.id, jobId, employeeId],
  );
  const r = res.rows[0];
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    jobId: String(r.job_id),
    employeeId: String(r.employee_id),
    assignedAt: new Date(r.assigned_at).toISOString(),
  };
}

async function pgListNotifications(userId: string): Promise<NotificationRecord[]> {
  const res = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  return res.rows.map((r) => ({
    id: String(r.id),
    companyId: String(r.company_id),
    userId: String(r.user_id),
    type: String(r.type),
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    data: (r.data as Record<string, unknown>) ?? {},
    readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

async function pgRegisterPushToken(
  userId: string,
  expoPushToken: string,
  platform: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO push_tokens (user_id, expo_push_token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, expo_push_token) DO UPDATE SET platform = $3, updated_at = now()`,
    [userId, expoPushToken.trim(), platform],
  );
}

// ——— Public API ———

export async function resolveAuth(authorizationHeader: string | undefined): Promise<AuthContext | null> {
  const token = bearerToken(authorizationHeader);
  if (!token) return null;
  if (await usePg()) {
    try {
      return await pgFindAuth(token);
    } catch {
      /* fall through */
    }
  }
  return jsonFindAuth(token);
}

export async function requireAuth(
  authorizationHeader: string | undefined,
): Promise<AuthContext> {
  const auth = await resolveAuth(authorizationHeader);
  if (!auth) throw new Error("Unauthorized");
  return auth;
}

export async function upsertCompanyForBoss(
  bossDeviceId: string,
  name: string,
): Promise<{ company: CompanyRecord; bossUser: UserRecord; bossToken: string; created: boolean }> {
  const result = (await usePg())
    ? await pgUpsertCompany(bossDeviceId, name)
    : await jsonUpsertCompany(bossDeviceId, name);
  return { ...result, bossToken: result.company.bossToken };
}

export async function createInvite(
  auth: AuthContext,
  input: CreateInviteInput,
): Promise<InviteRecord> {
  return (await usePg()) ? pgCreateInvite(auth, input) : jsonCreateInvite(auth, input);
}

export async function listInvites(auth: AuthContext): Promise<InviteRecord[]> {
  return (await usePg()) ? pgListInvites(auth.company.id) : jsonListInvites(auth.company.id);
}

export async function redeemInvite(input: RedeemInviteInput): Promise<AuthContext> {
  return (await usePg()) ? pgRedeemInvite(input) : jsonRedeemInvite(input);
}

export async function listEmployees(auth: AuthContext): Promise<EmployeeRecord[]> {
  return (await usePg()) ? pgListEmployees(auth.company.id) : jsonListEmployees(auth.company.id);
}

export async function listMessages(
  auth: AuthContext,
  channelType: MessageChannelType,
  channelId: string,
  since?: string,
): Promise<MessageRecord[]> {
  return (await usePg())
    ? pgListMessages(auth.company.id, channelType, channelId, since)
    : jsonListMessages(auth.company.id, channelType, channelId, since);
}

export async function createMessage(
  auth: AuthContext,
  channelType: MessageChannelType,
  channelId: string,
  body: string,
): Promise<MessageRecord> {
  return (await usePg())
    ? pgCreateMessage(auth, channelType, channelId, body)
    : jsonCreateMessage(auth, channelType, channelId, body);
}

export async function listJobAssignments(
  auth: AuthContext,
  employeeId?: string,
): Promise<JobAssignmentRecord[]> {
  const eid =
    employeeId?.trim() ||
    (auth.user.roleId === "employee" ? auth.employee?.id : undefined) ||
    "";
  if (!eid && auth.user.roleId === "employee") return [];
  if (auth.user.roleId === "employee" && auth.employee && eid !== auth.employee.id) {
    throw new Error("Forbidden");
  }
  const target = eid || auth.employee?.id;
  if (!target) {
    const snap = await readWorkspaceJson();
    if (await usePg()) {
      const res = await pool.query(`SELECT * FROM job_assignments WHERE company_id = $1`, [
        auth.company.id,
      ]);
      return res.rows.map((r) => ({
        id: String(r.id),
        companyId: String(r.company_id),
        jobId: String(r.job_id),
        employeeId: String(r.employee_id),
        assignedAt: new Date(r.assigned_at).toISOString(),
      }));
    }
    return snap.jobAssignments.filter((a) => a.companyId === auth.company.id);
  }
  return (await usePg()) ? pgListAssignments(target) : jsonListAssignments(target);
}

export async function upsertJobAssignment(
  auth: AuthContext,
  jobId: string,
  employeeId: string,
): Promise<JobAssignmentRecord> {
  if (auth.user.roleId !== "boss") throw new Error("Only boss can assign jobs.");
  return (await usePg())
    ? pgUpsertAssignment(auth, jobId, employeeId)
    : jsonUpsertAssignment(auth, jobId, employeeId);
}

export async function listNotifications(auth: AuthContext): Promise<NotificationRecord[]> {
  return (await usePg())
    ? pgListNotifications(auth.user.id)
    : jsonListNotifications(auth.user.id);
}

export async function registerPushToken(
  auth: AuthContext,
  expoPushToken: string,
  platform: string,
): Promise<void> {
  return (await usePg())
    ? pgRegisterPushToken(auth.user.id, expoPushToken, platform)
    : jsonRegisterPushToken(auth.user.id, expoPushToken, platform);
}

export function buildInviteLink(baseUrl: string, code: string): string {
  const root = baseUrl.replace(/\/+$/, "");
  return `${root}/employee/join?code=${encodeURIComponent(code)}`;
}
