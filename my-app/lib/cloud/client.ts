import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";

import type {
  CloudCompany,
  CloudEmployee,
  CloudInvite,
  CloudJobAssignment,
  CloudMessage,
  CloudNotification,
  CloudUser,
} from "./types";

type ApiError = { ok: false; error: string };

async function workspaceFetch<T>(
  path: string,
  options: RequestInit & { authToken?: string } = {},
): Promise<T> {
  const base = getPricingApiBaseUrl();
  if (!base) {
    throw new Error(
      "Cloud API not configured. Set EXPO_PUBLIC_PRICING_API_URL to your pricing-backend URL.",
    );
  }
  const { authToken, headers, ...rest } = options;
  const url = `${base.replace(/\/+$/, "")}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(headers as Record<string, string>),
    },
  });
  const json = (await res.json()) as T | ApiError;
  if (!res.ok || (json as ApiError).ok === false) {
    const err = (json as ApiError).error ?? `Request failed (${res.status})`;
    throw new Error(err);
  }
  return json as T;
}

export async function registerBossCompany(
  bossDeviceId: string,
  name: string,
): Promise<{ company: CloudCompany; bossToken: string; userId: string; created: boolean }> {
  const data = await workspaceFetch<{
    ok: true;
    company: CloudCompany;
    bossToken: string;
    userId: string;
    created?: boolean;
  }>("/api/workspace/company", {
    method: "POST",
    body: JSON.stringify({ bossDeviceId, name }),
  });
  return {
    company: data.company,
    bossToken: data.bossToken,
    userId: data.userId,
    created: data.created ?? false,
  };
}

export async function createCloudInvite(
  bossToken: string,
  input: {
    phone?: string;
    email?: string;
    localEmployeeId?: string;
    firstName?: string;
    lastName?: string;
    employeeId?: string;
  },
): Promise<{ invite: CloudInvite; inviteLink: string | null }> {
  const appBaseUrl =
    typeof process !== "undefined" && process.env.EXPO_PUBLIC_APP_DEEP_LINK_BASE?.trim()
      ? process.env.EXPO_PUBLIC_APP_DEEP_LINK_BASE.trim()
      : undefined;
  const data = await workspaceFetch<{
    ok: true;
    invite: CloudInvite;
    inviteLink: string | null;
  }>("/api/workspace/invites", {
    method: "POST",
    authToken: bossToken,
    body: JSON.stringify({ ...input, appBaseUrl }),
  });
  return { invite: data.invite, inviteLink: data.inviteLink };
}

export async function listCloudInvites(bossToken: string): Promise<CloudInvite[]> {
  const data = await workspaceFetch<{ ok: true; invites: CloudInvite[] }>(
    "/api/workspace/invites",
    { authToken: bossToken },
  );
  return data.invites;
}

export async function redeemCloudInvite(input: {
  code: string;
  displayName?: string;
  phone?: string;
  email?: string;
  deviceId?: string;
}): Promise<{
  authToken: string;
  user: CloudUser;
  company: CloudCompany;
  employee: CloudEmployee | null;
}> {
  const data = await workspaceFetch<{
    ok: true;
    authToken: string;
    user: CloudUser;
    company: CloudCompany;
    employee: CloudEmployee | null;
  }>("/api/workspace/invites/redeem", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    authToken: data.authToken,
    user: data.user,
    company: data.company,
    employee: data.employee,
  };
}

export async function listCloudMessages(
  authToken: string,
  channelType: "team" | "dm" | "job",
  channelId: string,
  since?: string,
): Promise<CloudMessage[]> {
  const q = new URLSearchParams({ channelType, channelId });
  if (since) q.set("since", since);
  const data = await workspaceFetch<{ ok: true; messages: CloudMessage[] }>(
    `/api/workspace/messages?${q.toString()}`,
    { authToken },
  );
  return data.messages;
}

export async function sendCloudMessage(
  authToken: string,
  channelType: "team" | "dm" | "job",
  channelId: string,
  body: string,
): Promise<CloudMessage> {
  const data = await workspaceFetch<{ ok: true; message: CloudMessage }>(
    "/api/workspace/messages",
    {
      method: "POST",
      authToken,
      body: JSON.stringify({ channelType, channelId, body }),
    },
  );
  return data.message;
}

export async function listCloudAssignments(
  authToken: string,
  employeeId?: string,
): Promise<CloudJobAssignment[]> {
  const q = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : "";
  const data = await workspaceFetch<{ ok: true; assignments: CloudJobAssignment[] }>(
    `/api/workspace/assignments${q}`,
    { authToken },
  );
  return data.assignments;
}

export async function listCloudNotifications(authToken: string): Promise<CloudNotification[]> {
  const data = await workspaceFetch<{ ok: true; notifications: CloudNotification[] }>(
    "/api/workspace/notifications",
    { authToken },
  );
  return data.notifications;
}

export async function registerCloudPushToken(
  authToken: string,
  expoPushToken: string,
  platform: string,
): Promise<void> {
  await workspaceFetch<{ ok: true }>("/api/workspace/push-token", {
    method: "POST",
    authToken,
    body: JSON.stringify({ expoPushToken, platform }),
  });
}

export function hasCloudApi(): boolean {
  return Boolean(getPricingApiBaseUrl());
}
