import Constants from "expo-constants";

import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";

export type ServiceRequestPriority = "normal" | "urgent" | "emergency";

export type ServiceRequestWorkflowStatus =
  | "new"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "canceled";

export type ServiceRequestPhoto = {
  id: string;
  mimeType: string;
  data: string;
  createdAt: string;
};

export type ServiceRequestRecord = {
  id: string;
  contractorToken: string;
  companyName: string;
  customerName: string;
  phone: string;
  email: string;
  serviceAddress: string;
  bestTimeToContact: string;
  description: string;
  priority: ServiceRequestPriority;
  photos: ServiceRequestPhoto[];
  workflowStatus: ServiceRequestWorkflowStatus;
  submittedAt: string;
  updatedAt: string;
};

type Extra = { serviceRequestBaseUrl?: string };

function fromExpoExtra(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.serviceRequestBaseUrl?.trim() ?? "";
}

/**
 * Public base URL for customer browser forms (no trailing slash).
 * Uses EXPO_PUBLIC_SERVICE_REQUEST_BASE_URL, then EXPO_PUBLIC_PRICING_API_URL / extra.pricingApiUrl.
 */
export function getServiceRequestBaseUrl(): string {
  const dedicated =
    typeof process !== "undefined" &&
    (process.env.EXPO_PUBLIC_SERVICE_REQUEST_BASE_URL?.trim() ||
      process.env.EXPO_PUBLIC_SERVICE_REQUEST_API_URL?.trim())
      ? String(
          process.env.EXPO_PUBLIC_SERVICE_REQUEST_BASE_URL?.trim() ||
            process.env.EXPO_PUBLIC_SERVICE_REQUEST_API_URL?.trim(),
        ).trim()
      : "";
  if (dedicated) {
    return dedicated.replace(/\/+$/, "");
  }
  const fromExtra = fromExpoExtra();
  if (fromExtra) return fromExtra.replace(/\/+$/, "");
  return getPricingApiBaseUrl();
}

export function hasBrowserServiceRequestLink(): boolean {
  return Boolean(getServiceRequestBaseUrl());
}

export type ServiceRequestLinkOptions = {
  companyName?: string;
  /** Use short path /r/{token} (default true). */
  shortPath?: boolean;
};

/**
 * Customer-facing link, e.g. http://192.168.1.10:3001/r/srabc123?companyName=Ideal+Solutions
 */
export function buildServiceRequestLink(
  contractorToken: string,
  options?: ServiceRequestLinkOptions,
): string {
  const base = getServiceRequestBaseUrl();
  const token = contractorToken.trim();
  if (!base || !token) return "";

  const withScheme = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  const short = options?.shortPath !== false;
  const path = short ? `/r/${encodeURIComponent(token)}` : `/request-service/${encodeURIComponent(token)}`;
  const u = new URL(`${withScheme.replace(/\/+$/, "")}${path}`);
  const company = (options?.companyName ?? "").trim();
  if (company) u.searchParams.set("companyName", company);
  return u.toString();
}

export function serviceRequestPriorityLabel(priority: ServiceRequestPriority): string {
  if (priority === "emergency") return "Emergency";
  if (priority === "urgent") return "Urgent";
  return "Normal — can be scheduled";
}

export function buildWorkOrderNotesFromInbound(req: ServiceRequestRecord): string {
  const lines: string[] = [
    `Priority: ${serviceRequestPriorityLabel(req.priority)}`,
    `Problem: ${req.description.trim()}`,
  ];
  if (req.bestTimeToContact.trim()) {
    lines.push(`Best time to contact: ${req.bestTimeToContact.trim()}`);
  }
  if (req.photos.length > 0) {
    lines.push(`Photos attached: ${req.photos.length}`);
  }
  lines.push("— Customer request (browser link)");
  lines.push(`Request ID: ${req.id}`);
  return lines.join("\n");
}

/** Alias used across the app and send-link screen. */
export type RemoteServiceRequest = ServiceRequestRecord;

/** @alias getServiceRequestBaseUrl */
export function getServiceRequestApiBaseUrl(): string {
  return getServiceRequestBaseUrl();
}

/**
 * Customer Request Service URL on pricing-backend.
 * Example: http://192.168.1.10:3001/r/ctr-abc123?companyName=Ideal+Solutions
 */
export function defaultPublicRequestFormUrl(
  apiBase: string,
  contractorToken: string,
  companyName?: string,
): string {
  const base = apiBase.trim().replace(/\/+$/, "");
  const token = contractorToken.trim();
  if (!base || !token) return "";
  const withScheme = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  const u = new URL(`${withScheme}/r/${encodeURIComponent(token)}`);
  const company = (companyName ?? "").trim();
  if (company) u.searchParams.set("companyName", company);
  return u.toString();
}

async function fetchServiceRequestInboxResult(
  contractorToken: string,
): Promise<{ ok: boolean; requests: ServiceRequestRecord[]; error?: string }> {
  const base = getServiceRequestBaseUrl();
  if (!base) {
    return { ok: false, requests: [], error: "Service request server not configured." };
  }
  const url = `${base}/api/service-requests/inbox?contractorToken=${encodeURIComponent(contractorToken.trim())}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      ok?: boolean;
      requests?: ServiceRequestRecord[];
      error?: string;
    };
    if (!res.ok || !json.ok) {
      return { ok: false, requests: [], error: json.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, requests: Array.isArray(json.requests) ? json.requests : [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, requests: [], error: msg };
  }
}

/** Used by serviceRequestSync — throws when the inbox cannot be loaded. */
export async function fetchServiceRequestInbox(contractorToken: string): Promise<RemoteServiceRequest[]> {
  const result = await fetchServiceRequestInboxResult(contractorToken);
  if (!result.ok) {
    throw new Error(result.error ?? "Inbox unavailable");
  }
  return result.requests;
}

export async function patchRemoteServiceRequestStatus(
  contractorToken: string,
  requestId: string,
  workflowStatus: ServiceRequestWorkflowStatus,
): Promise<void> {
  const base = getServiceRequestBaseUrl();
  if (!base || !requestId.trim()) return;
  try {
    await fetch(`${base}/api/service-requests/${encodeURIComponent(requestId.trim())}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractorToken: contractorToken.trim(),
        workflowStatus,
      }),
    });
  } catch {
    /* best-effort sync to server */
  }
}
