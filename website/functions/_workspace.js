const SNAPSHOT_KEY = "workspace:snapshot:v1";

const EMPTY_SNAPSHOT = {
  companies: [],
  users: [],
  employees: [],
  invites: [],
  jobs: [],
  jobAssignments: [],
  messages: [],
  notifications: [],
  pushTokens: [],
};

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nowIso() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function token(prefix) {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return `${prefix}_${btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function bearerToken(header) {
  const raw = str(header);
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return str(match?.[1] ?? raw);
}

function ensureKv(env) {
  if (!env.WORKSPACE_KV) {
    throw new Error("WORKSPACE_KV binding is not configured.");
  }
  return env.WORKSPACE_KV;
}

async function readSnapshot(env) {
  const kv = ensureKv(env);
  const raw = await kv.get(SNAPSHOT_KEY);
  if (!raw) return structuredClone(EMPTY_SNAPSHOT);
  try {
    const parsed = JSON.parse(raw);
    return {
      companies: parsed.companies ?? [],
      users: parsed.users ?? [],
      employees: parsed.employees ?? [],
      invites: parsed.invites ?? [],
      jobs: parsed.jobs ?? [],
      jobAssignments: parsed.jobAssignments ?? [],
      messages: parsed.messages ?? [],
      notifications: parsed.notifications ?? [],
      pushTokens: parsed.pushTokens ?? [],
    };
  } catch {
    return structuredClone(EMPTY_SNAPSHOT);
  }
}

async function writeSnapshot(env, snapshot) {
  const kv = ensureKv(env);
  await kv.put(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function findAuth(snapshot, authorizationHeader) {
  const authToken = bearerToken(authorizationHeader);
  if (!authToken) return null;
  const user = snapshot.users.find((row) => row.authToken === authToken);
  if (user) {
    const company = snapshot.companies.find((row) => row.id === user.companyId);
    if (!company) return null;
    const employee =
      user.roleId === "employee"
        ? snapshot.employees.find((row) => row.userId === user.id) ?? null
        : null;
    return { user, company, employee };
  }
  const company = snapshot.companies.find((row) => row.bossToken === authToken);
  if (!company) return null;
  const boss = snapshot.users.find((row) => row.companyId === company.id && row.roleId === "boss");
  if (!boss) return null;
  return { user: boss, company, employee: null };
}

function buildInviteLink(baseUrl, code) {
  return `${baseUrl.replace(/\/+$/g, "")}/employee/join?code=${encodeURIComponent(code)}`;
}

async function requestBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function handleWorkspaceRequest(request, env, url) {
  try {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
    const snapshot = await readSnapshot(env);
    const body = request.method === "POST" ? await requestBody(request) : {};

    if (request.method === "GET" && url.pathname === "/api/workspace/health") {
      return json({ ok: true, service: "ideal-workspace-pages-function" });
    }

    if (request.method === "POST" && url.pathname === "/api/workspace/company") {
      const bossDeviceId = str(body.bossDeviceId) || str(request.headers.get("x-boss-device-id"));
      if (!bossDeviceId) return json({ ok: false, error: "bossDeviceId is required." }, 400);

      const existing = findAuth(snapshot, request.headers.get("authorization"));
      if (existing?.user.roleId === "boss") {
        return json({
          ok: true,
          company: existing.company,
          bossToken: existing.company.bossToken,
          userId: existing.user.id,
        });
      }

      const ts = nowIso();
      let company = snapshot.companies.find((row) => row.bossDeviceId === bossDeviceId);
      let created = false;
      let boss = company
        ? snapshot.users.find((row) => row.companyId === company.id && row.roleId === "boss")
        : null;

      if (!company) {
        created = true;
        company = {
          id: id(),
          name: str(body.name) || "Company",
          bossDeviceId,
          bossToken: token("boss"),
          createdAt: ts,
          updatedAt: ts,
        };
        boss = {
          id: id(),
          companyId: company.id,
          roleId: "boss",
          displayName: company.name || "Boss",
          phone: "",
          email: "",
          authToken: company.bossToken,
          deviceId: bossDeviceId,
          createdAt: ts,
          updatedAt: ts,
        };
        snapshot.companies.push(company);
        snapshot.users.push(boss);
      } else {
        company.name = str(body.name) || company.name;
        company.updatedAt = ts;
        if (!boss) {
          boss = {
            id: id(),
            companyId: company.id,
            roleId: "boss",
            displayName: company.name || "Boss",
            phone: "",
            email: "",
            authToken: company.bossToken,
            deviceId: bossDeviceId,
            createdAt: ts,
            updatedAt: ts,
          };
          snapshot.users.push(boss);
        }
      }

      await writeSnapshot(env, snapshot);
      return json({ ok: true, created, company, bossToken: company.bossToken, userId: boss.id });
    }

    const auth = findAuth(snapshot, request.headers.get("authorization"));

    if (request.method === "GET" && url.pathname === "/api/workspace/company") {
      if (!auth) return json({ ok: false, error: "Unauthorized" }, 401);
      return json({ ok: true, company: auth.company, user: auth.user, employee: auth.employee });
    }

    if (request.method === "POST" && url.pathname === "/api/workspace/invites") {
      if (!auth) return json({ ok: false, error: "Unauthorized" }, 401);
      if (auth.user.roleId !== "boss") {
        return json({ ok: false, error: "Only boss can create invites." }, 403);
      }

      const ts = nowIso();
      const localEmployeeId = str(body.localEmployeeId);
      let employeeId = str(body.employeeId) || null;
      if (!employeeId && localEmployeeId) {
        let employee = snapshot.employees.find(
          (row) => row.companyId === auth.company.id && row.localEmployeeId === localEmployeeId,
        );
        if (!employee) {
          employee = {
            id: id(),
            companyId: auth.company.id,
            userId: null,
            localEmployeeId,
            firstName: str(body.firstName),
            lastName: str(body.lastName),
            phone: str(body.phone),
            email: str(body.email),
            permissions: {},
            status: "active",
            createdAt: ts,
            updatedAt: ts,
          };
          snapshot.employees.push(employee);
        }
        employeeId = employee.id;
      }

      let code = inviteCode();
      while (snapshot.invites.some((row) => row.code === code)) code = inviteCode();
      const invite = {
        id: id(),
        companyId: auth.company.id,
        code,
        phone: str(body.phone),
        email: str(body.email),
        invitedByUserId: auth.user.id,
        employeeId,
        expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
        redeemedAt: null,
        redeemedByUserId: null,
        createdAt: ts,
      };
      snapshot.invites.push(invite);
      await writeSnapshot(env, snapshot);

      const appBaseUrl = str(body.appBaseUrl) || str(env.WORKSPACE_APP_BASE_URL);
      return json({ ok: true, invite, inviteLink: appBaseUrl ? buildInviteLink(appBaseUrl, code) : null });
    }

    if (request.method === "GET" && url.pathname === "/api/workspace/invites") {
      if (!auth) return json({ ok: false, error: "Unauthorized" }, 401);
      if (auth.user.roleId !== "boss") {
        return json({ ok: false, error: "Only boss can list invites." }, 403);
      }
      const invites = snapshot.invites
        .filter((row) => row.companyId === auth.company.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json({ ok: true, invites });
    }

    if (request.method === "POST" && url.pathname === "/api/workspace/invites/redeem") {
      const code = str(body.code).toUpperCase();
      if (!code) return json({ ok: false, error: "Invite code is required." }, 400);
      const invite = snapshot.invites.find((row) => row.code === code);
      if (!invite) return json({ ok: false, error: "Invalid invite code." }, 400);
      if (invite.redeemedAt) return json({ ok: false, error: "This invite was already used." }, 400);
      if (invite.expiresAt && invite.expiresAt < nowIso()) {
        return json({ ok: false, error: "This invite has expired." }, 400);
      }
      const company = snapshot.companies.find((row) => row.id === invite.companyId);
      if (!company) return json({ ok: false, error: "Company not found." }, 400);

      const ts = nowIso();
      let employee = invite.employeeId
        ? snapshot.employees.find((row) => row.id === invite.employeeId)
        : null;
      if (!employee) {
        const displayParts = str(body.displayName).split(" ");
        employee = {
          id: id(),
          companyId: company.id,
          userId: null,
          localEmployeeId: "",
          firstName: displayParts[0] ?? "",
          lastName: displayParts.slice(1).join(" "),
          phone: str(body.phone) || invite.phone,
          email: str(body.email) || invite.email,
          permissions: {},
          status: "active",
          createdAt: ts,
          updatedAt: ts,
        };
        invite.employeeId = employee.id;
        snapshot.employees.push(employee);
      }

      const displayName =
        str(body.displayName) ||
        `${employee.firstName} ${employee.lastName}`.trim() ||
        str(body.phone) ||
        str(body.email) ||
        "Employee";
      const user = {
        id: id(),
        companyId: company.id,
        roleId: "employee",
        displayName,
        phone: str(body.phone) || employee.phone,
        email: str(body.email) || employee.email,
        authToken: token("emp"),
        deviceId: str(body.deviceId),
        createdAt: ts,
        updatedAt: ts,
      };
      snapshot.users.push(user);
      employee.userId = user.id;
      employee.updatedAt = ts;
      invite.redeemedAt = ts;
      invite.redeemedByUserId = user.id;

      const boss = snapshot.users.find((row) => row.companyId === company.id && row.roleId === "boss");
      if (boss) {
        snapshot.notifications.push({
          id: id(),
          companyId: company.id,
          userId: boss.id,
          type: "employee_joined",
          title: "Employee joined",
          body: `${displayName} joined via invite ${code}.`,
          data: { employeeId: employee.id, inviteCode: code },
          readAt: null,
          createdAt: ts,
        });
      }

      await writeSnapshot(env, snapshot);
      return json({ ok: true, authToken: user.authToken, user, company, employee });
    }

    if (request.method === "GET" && url.pathname === "/api/workspace/notifications") {
      if (!auth) return json({ ok: false, error: "Unauthorized" }, 401);
      const notifications = snapshot.notifications
        .filter((row) => row.userId === auth.user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json({ ok: true, notifications });
    }

    if (request.method === "GET" && url.pathname === "/api/workspace/assignments") {
      if (!auth) return json({ ok: false, error: "Unauthorized" }, 401);
      const employeeId = str(url.searchParams.get("employeeId")) || auth.employee?.id || "";
      return json({
        ok: true,
        assignments: snapshot.jobAssignments.filter(
          (row) => row.companyId === auth.company.id && (!employeeId || row.employeeId === employeeId),
        ),
      });
    }

    if (request.method === "POST" && url.pathname === "/api/workspace/push-token") {
      if (!auth) return json({ ok: false, error: "Unauthorized" }, 401);
      const expoPushToken = str(body.expoPushToken);
      if (!expoPushToken) return json({ ok: false, error: "expoPushToken is required." }, 400);
      const existing = snapshot.pushTokens.find(
        (row) => row.userId === auth.user.id && row.expoPushToken === expoPushToken,
      );
      if (existing) {
        existing.platform = str(body.platform);
        existing.updatedAt = nowIso();
      } else {
        snapshot.pushTokens.push({
          id: id(),
          userId: auth.user.id,
          expoPushToken,
          platform: str(body.platform),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }
      await writeSnapshot(env, snapshot);
      return json({ ok: true, registered: true, note: "Server push send is phase 2." });
    }

    return json({ ok: false, error: "Not found" }, 404);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Workspace API failed.";
    return json({ ok: false, error: message }, 500);
  }
}
