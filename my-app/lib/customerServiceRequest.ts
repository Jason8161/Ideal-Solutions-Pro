import * as Linking from "expo-linking";

import {
  defaultPublicRequestFormUrl,
  getServiceRequestApiBaseUrl,
  type RemoteServiceRequest,
  type ServiceRequestPriority,
} from "@/lib/serviceRequestApi";
import {
  emptyServiceCallCustomerFields,
  type ServiceCallCustomerFields,
} from "@/lib/mapPhoneContactToCustomer";

/** @deprecated Legacy two-option urgency — prefer ServiceRequestPriority */
export type ServiceRequestUrgency = "emergency" | "scheduled";

export type CustomerRequestPayload = {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  problemDescription: string;
  preferredDateTime: string;
  /** Emergency vs. routine scheduling. */
  urgency: ServiceRequestUrgency;
};

export type ContractorContactInLink = {
  contractorEmail: string;
  contractorPhone: string;
  companyName: string;
};

/** Label for the share button in the contractor app. */
export const CUSTOMER_REQUEST_SHARE_BUTTON_LABEL = "Send Customer Service Call Link";

/** Short line shown to the customer in SMS / share (link is sent separately where supported). */
export const CUSTOMER_REQUEST_INVITE_COPY = "Request Service";

/** Native share sheet title — matches the primary action after opening the link. */
export const CUSTOMER_REQUEST_SHARE_SHEET_TITLE = "Request Service";

/** Primary button on the customer landing step (before the detail form). */
export const CUSTOMER_REQUEST_CUSTOMER_CTA_LABEL = "Request Service";

/**
 * Default HTTPS URL baked into store builds (optional).
 * Prefer `EXPO_PUBLIC_CUSTOMER_REQUEST_URL` pointing at pricing-backend `/request-service`
 * or static `public/customer-request-invite.html` on any HTTPS host.
 */
const SHIPPED_CUSTOMER_REQUEST_INVITE_PAGE = "";

/** Browser invite base URL: env override, then shipped default, else empty (native-only links). */
export function getPublicCustomerRequestInviteBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_CUSTOMER_REQUEST_URL?.trim() ?? "";
  if (fromEnv) return fromEnv;
  return SHIPPED_CUSTOMER_REQUEST_INVITE_PAGE.trim();
}

export function hasPublicCustomerRequestInvitePage(): boolean {
  return Boolean(getPublicCustomerRequestInviteBaseUrl());
}

export function emptyCustomerRequestPayload(): CustomerRequestPayload {
  return {
    customerName: "",
    phone: "",
    email: "",
    address: "",
    problemDescription: "",
    preferredDateTime: "",
    urgency: "scheduled",
  };
}

export function serviceRequestUrgencyLabel(u: ServiceRequestUrgency): string {
  return u === "emergency" ? "Emergency — needs prompt attention" : "Can be scheduled — not urgent";
}

export function priorityLabel(p: ServiceRequestPriority): string {
  switch (p) {
    case "emergency":
      return "Emergency";
    case "urgent":
      return "Urgent";
    default:
      return "Normal";
  }
}

export function remoteToServiceCallFields(req: RemoteServiceRequest): ServiceCallCustomerFields {
  const base = emptyServiceCallCustomerFields();
  const lines: string[] = [
    `Priority: ${priorityLabel(req.priority)}`,
    req.description.trim() && `Problem: ${req.description.trim()}`,
    req.bestTimeToContact.trim() && `Best time to contact: ${req.bestTimeToContact.trim()}`,
    "— Customer Request Service link (web)",
  ].filter(Boolean) as string[];
  return {
    ...base,
    customerName: req.customerName.trim(),
    phoneMobile: req.phone.trim(),
    email: req.email.trim(),
    street: req.serviceAddress.trim(),
    workOrderNotes: lines.join("\n"),
  };
}

export function buildWorkOrderNotesFromRequest(p: CustomerRequestPayload): string {
  const lines: string[] = [];
  lines.push(`Request type: ${serviceRequestUrgencyLabel(p.urgency)}`);
  if (p.problemDescription.trim()) {
    lines.push(`Problem: ${p.problemDescription.trim()}`);
  }
  if (p.preferredDateTime.trim()) {
    lines.push(`Preferred date/time: ${p.preferredDateTime.trim()}`);
  }
  lines.push("— Customer self-service request");
  return lines.join("\n");
}

export function payloadToServiceCallFields(p: CustomerRequestPayload): ServiceCallCustomerFields {
  const base = emptyServiceCallCustomerFields();
  return {
    ...base,
    customerName: p.customerName.trim(),
    phoneMobile: p.phone.trim(),
    email: p.email.trim(),
    street: p.address.trim(),
    workOrderNotes: buildWorkOrderNotesFromRequest(p),
  };
}

function encodeQuery(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v.trim()) out[k] = v.trim();
  }
  return out;
}

function customerRequestQueryParams(
  contact: ContractorContactInLink,
  contractorToken: string,
): Record<string, string> {
  const q = encodeQuery({
    token: contractorToken,
    companyName: contact.companyName,
    contractorEmail: contact.contractorEmail,
    contractorPhone: contact.contractorPhone,
  });
  const apiBase = getServiceRequestApiBaseUrl();
  if (apiBase) q.apiBase = apiBase;
  return q;
}

/**
 * Opens the in-app service call request screen (Ideal Solutions Pro must be installed).
 * Same shape as `Linking.createURL` for this route — use for native share fallback only.
 */
export function buildNativeCustomerRequestAppUrl(
  contact: ContractorContactInLink,
  contractorToken: string,
): string {
  return Linking.createURL("/service-calls/customer-request", {
    scheme: "ideal-solutions",
    queryParams: customerRequestQueryParams(contact, contractorToken),
  });
}

/**
 * Link you send to customers (SMS, email, etc.).
 * - If API base is set: pricing-backend `/request-service?token=…` (POST inbox — no app on customer phone).
 * - Else if `EXPO_PUBLIC_CUSTOMER_REQUEST_URL` / shipped static page: HTTPS invite with token query.
 * - Otherwise: `ideal-solutions://…` deep link (requires the app on the recipient's phone).
 */
export function buildCustomerRequestLink(
  contact: ContractorContactInLink,
  contractorToken: string,
): string {
  const apiBase = getServiceRequestApiBaseUrl();
  if (apiBase && contractorToken.trim()) {
    return defaultPublicRequestFormUrl(apiBase, contractorToken.trim(), contact.companyName);
  }

  const publicBase = getPublicCustomerRequestInviteBaseUrl();
  if (publicBase) {
    const withScheme = /^https?:\/\//i.test(publicBase) ? publicBase : `https://${publicBase}`;
    const u = new URL(withScheme.replace(/\/+$/, ""));
    const q = customerRequestQueryParams(contact, contractorToken);
    for (const [k, v] of Object.entries(q)) {
      u.searchParams.set(k, v);
    }
    return u.toString();
  }
  return buildNativeCustomerRequestAppUrl(contact, contractorToken);
}

/** Deep link for contractor to import a draft service call (same device / tap from email). */
export function buildImportServiceCallLink(p: CustomerRequestPayload): string {
  const fields = payloadToServiceCallFields(p);
  return Linking.createURL("/service-calls/new", {
    scheme: "ideal-solutions",
    queryParams: encodeQuery({
      fromCustomer: "1",
      customerName: fields.customerName,
      phoneMobile: fields.phoneMobile,
      email: fields.email,
      street: fields.street,
      workOrderNotes: fields.workOrderNotes,
    }),
  });
}

export function buildShareMessage(_contact: ContractorContactInLink): string {
  return CUSTOMER_REQUEST_INVITE_COPY;
}

/**
 * True when the invite URL only works on a machine running Metro / Expo Go — not on a normal phone SMS.
 */
export function isCustomerInviteLinkLikelyDevOnly(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return (
    lower.startsWith("exp://") ||
    lower.startsWith("expo://") ||
    lower.startsWith("http://localhost") ||
    lower.startsWith("http://127.0.0.1") ||
    lower.startsWith("https://localhost") ||
    lower.startsWith("https://127.0.0.1")
  );
}

function usesHttpsCustomerInvitePage(): boolean {
  return hasPublicCustomerRequestInvitePage() || Boolean(getServiceRequestApiBaseUrl());
}

/**
 * Full text for SMS / system share: prompt + deep link in one string.
 * iOS Messages does not reliably append the Share API `url` field into the message body, so the link must appear in `message`.
 */
export function buildCustomerInviteShareBody(
  contact: ContractorContactInLink,
  contractorToken: string,
): string {
  const link = buildCustomerRequestLink(contact, contractorToken);
  const lines = [
    buildShareMessage(contact),
    "",
    link,
    "",
    "Tap the link to open a short form in your browser — no app or login required.",
  ];

  if (isCustomerInviteLinkLikelyDevOnly(link)) {
    lines.push(
      "",
      "Note: this is a developer link. It only opens in Expo Go while your dev server is running — it will not open on someone else's phone.",
    );
  } else if (!usesHttpsCustomerInvitePage() && !getServiceRequestApiBaseUrl()) {
    lines.push(
      "",
      "This link opens only inside the Ideal Solutions Pro mobile app. For a browser form, set EXPO_PUBLIC_PRICING_API_URL (or EXPO_PUBLIC_CUSTOMER_REQUEST_URL) and restart Expo.",
    );
  }

  return lines.join("\n");
}

export function buildCustomerInviteSmsBody(
  contact: ContractorContactInLink,
  contractorToken: string,
): string {
  return buildCustomerInviteShareBody(contact, contractorToken);
}

export function buildCustomerInviteEmailBody(
  contact: ContractorContactInLink,
  contractorToken: string,
): string {
  const company = contact.companyName.trim() || "your contractor";
  const link = buildCustomerRequestLink(contact, contractorToken);
  return [
    `Hello,`,
    ``,
    `${company} invited you to submit a service request.`,
    ``,
    `Request Service: ${link}`,
    ``,
    `Open the link on your phone, fill in your details, and submit. No app install or login required.`,
    ``,
    `— Sent via Ideal Solutions Pro`,
  ].join("\n");
}

export function buildCustomerInviteMailtoUrl(
  contact: ContractorContactInLink,
  contractorToken: string,
  recipientEmail?: string,
): string {
  const company = contact.companyName.trim() || "Service";
  const subject = encodeURIComponent(`Request Service — ${company}`);
  const body = encodeURIComponent(buildCustomerInviteEmailBody(contact, contractorToken));
  const to = encodeURIComponent((recipientEmail ?? "").trim());
  return to ? `mailto:${to}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
}

export function buildCustomerInviteSmsUrl(
  contact: ContractorContactInLink,
  contractorToken: string,
  recipientPhone?: string,
): string {
  const body = encodeURIComponent(buildCustomerInviteSmsBody(contact, contractorToken));
  const digits = (recipientPhone ?? "").replace(/[^\d+]/g, "");
  return digits ? `sms:${digits}?body=${body}` : `sms:?body=${body}`;
}

export function buildCustomerRequestEmailBody(
  p: CustomerRequestPayload,
  contact: ContractorContactInLink,
): string {
  const importLink = buildImportServiceCallLink(p);
  const lines = [
    "New service call request from a customer:",
    "",
    `Name: ${p.customerName.trim() || "—"}`,
    `Phone: ${p.phone.trim() || "—"}`,
    `Email: ${p.email.trim() || "—"}`,
    `Service address: ${p.address.trim() || "—"}`,
    `Request type: ${serviceRequestUrgencyLabel(p.urgency)}`,
    `Problem: ${p.problemDescription.trim() || "—"}`,
    `Preferred date/time: ${p.preferredDateTime.trim() || "—"}`,
    "",
    "— Sent via Ideal Solutions Pro customer request",
    "",
    "Contractor: open this link on your phone to pre-fill a new service call in the app:",
    importLink,
  ];
  return lines.join("\n");
}

export function buildMailtoUrl(
  contractorEmail: string,
  p: CustomerRequestPayload,
  contact: ContractorContactInLink,
): string {
  const subject = encodeURIComponent(
    `${p.urgency === "emergency" ? "[EMERGENCY] " : ""}Service call request — ${p.customerName.trim() || "Customer"}`,
  );
  const body = encodeURIComponent(buildCustomerRequestEmailBody(p, contact));
  return `mailto:${encodeURIComponent(contractorEmail.trim())}?subject=${subject}&body=${body}`;
}

export function buildSmsUrl(contractorPhone: string, p: CustomerRequestPayload): string {
  const body = [
    "Service call request:",
    p.urgency === "emergency" ? "EMERGENCY — needs prompt attention" : "Can be scheduled (not urgent)",
    p.customerName.trim() && `Name: ${p.customerName.trim()}`,
    p.phone.trim() && `Phone: ${p.phone.trim()}`,
    p.problemDescription.trim() && `Problem: ${p.problemDescription.trim()}`,
    p.preferredDateTime.trim() && `When: ${p.preferredDateTime.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
  const digits = contractorPhone.replace(/[^\d+]/g, "");
  return `sms:${digits}?body=${encodeURIComponent(body)}`;
}

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? "").trim();
  return (value ?? "").trim();
}

export function parseContractorContactFromParams(
  params: Record<string, string | string[] | undefined>,
): ContractorContactInLink {
  return {
    contractorEmail: paramString(params.contractorEmail),
    contractorPhone: paramString(params.contractorPhone),
    companyName: paramString(params.companyName),
  };
}

export function parseContractorTokenFromParams(
  params: Record<string, string | string[] | undefined>,
): string {
  return paramString(params.token);
}

export function parseServiceCallFieldsFromParams(
  params: Record<string, string | string[] | undefined>,
): Partial<ServiceCallCustomerFields> {
  const keys: (keyof ServiceCallCustomerFields)[] = [
    "customerName",
    "companyName",
    "street",
    "city",
    "state",
    "zip",
    "email",
    "emailAlt",
    "phoneMobile",
    "phoneHome",
    "phoneWork",
    "workOrderNotes",
  ];
  const out: Partial<ServiceCallCustomerFields> = {};
  for (const key of keys) {
    const v = paramString(params[key]);
    if (v) out[key] = v;
  }
  return out;
}

export function isFromCustomerRequest(params: Record<string, string | string[] | undefined>): boolean {
  return paramString(params.fromCustomer) === "1";
}

export function validateCustomerRequest(p: CustomerRequestPayload): string | null {
  if (p.urgency !== "emergency" && p.urgency !== "scheduled") {
    return "Choose whether this is an emergency or can be scheduled.";
  }
  const hasName = p.customerName.trim().length > 0;
  const hasPhone = p.phone.trim().length > 0;
  const hasEmail = p.email.trim().length > 0;
  if (!hasName && !hasPhone && !hasEmail) {
    return "Enter at least your name, phone, or email.";
  }
  if (!p.problemDescription.trim()) {
    return "Describe the problem or service needed.";
  }
  return null;
}
