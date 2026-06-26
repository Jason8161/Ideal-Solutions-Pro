import { buildCompanyInviteAcceptUrl, resolveInviteAppBaseUrl } from "@/lib/appInviteBaseUrl";
import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";
import type { CompanyRoleId } from "@/lib/permissions/companyRoles";
import type { SubscriptionTierId } from "@/lib/subscriptions/tiers";

export type CompanyUserView = {
  userId: string;
  email: string;
  fullName: string;
  roleId: CompanyRoleId;
  status: "active" | "invited" | "disabled";
  memberId: string;
  createdAt: string;
};

export type CompanyInviteView = {
  id: string;
  companyId: string;
  email: string;
  roleId: CompanyRoleId;
  code: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type AuditEventView = {
  id: string;
  companyId: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function baseUrl(): string | null {
  const url = getPricingApiBaseUrl();
  return url ? url.replace(/\/+$/, "") : null;
}

async function companyFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const root = baseUrl();
  if (!root) throw new Error("COMPANY_API_UNCONFIGURED");
  const res = await fetch(`${root}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || json.ok === false) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }
  return json;
}

export function hasCompanyUserApi(): boolean {
  return Boolean(baseUrl());
}

export async function fetchCompanyMe(token: string): Promise<{
  company: { id: string; name: string };
  user: {
    userId: string;
    email: string;
    fullName: string;
    companyId: string;
    companyName: string;
    roleId: CompanyRoleId;
    subscriptionTier: SubscriptionTierId;
  };
}> {
  return companyFetch("/api/company/me", token);
}

export async function fetchCompanyUsers(token: string): Promise<{
  users: CompanyUserView[];
  subscriptionTier: SubscriptionTierId;
}> {
  return companyFetch("/api/company/users", token);
}

export async function createCompanyInvite(
  token: string,
  input: { email: string; roleId: CompanyRoleId; expiresInDays?: number },
): Promise<{ invite: CompanyInviteView; inviteLink: string }> {
  const appBaseUrl = resolveInviteAppBaseUrl();
  const data = await companyFetch<{ invite: CompanyInviteView; inviteLink: string | null }>(
    "/api/company/invites",
    token,
    {
      method: "POST",
      body: JSON.stringify({ ...input, appBaseUrl }),
    },
  );
  return {
    invite: data.invite,
    inviteLink: buildCompanyInviteAcceptUrl(data.invite.code, data.inviteLink),
  };
}

export async function fetchCompanyInvites(token: string): Promise<{ invites: CompanyInviteView[] }> {
  return companyFetch("/api/company/invites", token);
}

export async function previewCompanyInvite(code: string): Promise<{
  invite: {
    email: string;
    roleId: CompanyRoleId;
    roleLabel: string;
    expiresAt: string;
    accepted: boolean;
  };
}> {
  const root = baseUrl();
  if (!root) throw new Error("COMPANY_API_UNCONFIGURED");
  const res = await fetch(`${root}/api/company/invites/preview?code=${encodeURIComponent(code)}`);
  const json = (await res.json()) as { ok: boolean; error?: string; invite?: unknown };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Invalid invite");
  }
  return json as ReturnType<typeof previewCompanyInvite> extends Promise<infer R> ? R : never;
}

export async function acceptCompanyInvite(input: {
  code: string;
  password: string;
  fullName?: string;
}): Promise<{ message: string; roleId: CompanyRoleId }> {
  const root = baseUrl();
  if (!root) throw new Error("COMPANY_API_UNCONFIGURED");
  const res = await fetch(`${root}/api/company/invites/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as { ok: boolean; error?: string; message?: string; roleId?: CompanyRoleId };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not accept invite");
  }
  return { message: json.message ?? "Account created.", roleId: json.roleId ?? "employee" };
}

export async function updateCompanyUserRole(
  token: string,
  userId: string,
  roleId: CompanyRoleId,
): Promise<void> {
  await companyFetch(`/api/company/users/${encodeURIComponent(userId)}/role`, token, {
    method: "PATCH",
    body: JSON.stringify({ roleId }),
  });
}

export async function updateCompanyUserStatus(
  token: string,
  userId: string,
  status: "active" | "disabled",
): Promise<void> {
  await companyFetch(`/api/company/users/${encodeURIComponent(userId)}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchCompanyAudit(token: string, limit = 50): Promise<{ events: AuditEventView[] }> {
  return companyFetch(`/api/company/audit?limit=${limit}`, token);
}

export async function postCompanyAudit(
  token: string,
  input: {
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await companyFetch("/api/company/audit", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchCompanyRoles(): Promise<{ id: CompanyRoleId; label: string }[]> {
  const root = baseUrl();
  if (!root) return [];
  const res = await fetch(`${root}/api/company/roles`);
  const json = (await res.json()) as { ok: boolean; roles?: { id: CompanyRoleId; label: string }[] };
  return json.roles ?? [];
}
