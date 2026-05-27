import Constants from "expo-constants";

import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";
import { decodeBase64Url, encodeBase64Url } from "@/lib/base64Url";

import {
  getEnabledCustomerPaymentMethods,
  loadCustomerPaymentMethods,
  type CustomerPaymentMethod,
} from "./customerPaymentMethodsStorage";
import { loadInvoiceCustomization } from "./invoiceCustomizationStorage";
import {
  appendInvoiceParamsToPaymentUrl,
  buildInvoicePaymentLink,
  invoicePaymentLinkParams,
  type InvoicePaymentLinkParams,
} from "./invoicePaymentLink";
import {
  isInvoicePaymentLinkConfigured,
  loadInvoicePaymentSettings,
  type InvoicePaymentSettings,
} from "./invoicePaymentSettingsStorage";
import type { BossInvoice } from "./types";

type Extra = { payPageBaseUrl?: string };

const PAY_GREEN = "#22c55e";

type CompactPayMethod = {
  p: string;
  n: string;
  u?: string;
};

function fromExpoExtra(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.payPageBaseUrl?.trim() ?? "";
}

/**
 * Hosted customer pay page base (no trailing slash).
 * Uses EXPO_PUBLIC_PAY_PAGE_BASE_URL, then pricing API / service-request base.
 */
export function getPayPageBaseUrl(): string {
  const dedicated =
    typeof process !== "undefined" ? process.env.EXPO_PUBLIC_PAY_PAGE_BASE_URL?.trim() ?? "" : "";
  if (dedicated) return dedicated.replace(/\/+$/, "");
  const fromExtra = fromExpoExtra();
  if (fromExtra) return fromExtra.replace(/\/+$/, "");
  return getPricingApiBaseUrl();
}

export function hasHostedPayPage(): boolean {
  return Boolean(getPayPageBaseUrl());
}

export function encodePaymentMethodsForLink(methods: CustomerPaymentMethod[]): string {
  const compact: CompactPayMethod[] = getEnabledCustomerPaymentMethods(methods).map((m) => ({
    p: m.preset,
    n: m.name,
    ...(m.payUrl ? { u: m.payUrl } : {}),
  }));
  const json = JSON.stringify(compact);
  return encodeBase64Url(json);
}

export function decodePaymentMethodsFromLink(encoded: string): CustomerPaymentMethod[] {
  const trimmed = encoded.trim();
  if (!trimmed) return [];
  try {
    const json = decodeBase64Url(trimmed);
    const parsed = JSON.parse(json) as CompactPayMethod[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row, index) => ({
      id: `link-${row.p}-${index}`,
      preset: (row.p as CustomerPaymentMethod["preset"]) ?? "custom",
      name: row.n?.trim() || "Pay",
      enabled: true,
      ...(row.u ? { payUrl: row.u } : {}),
    }));
  } catch {
    return [];
  }
}

export type InvoicePayLinkQuery = InvoicePaymentLinkParams & {
  company?: string;
  m?: string;
};

export function buildInvoicePayLinkQuery(
  invoice: BossInvoice,
  options?: { companyName?: string; methods?: CustomerPaymentMethod[] },
): InvoicePayLinkQuery {
  const params = invoicePaymentLinkParams(invoice);
  const methods = options?.methods;
  const query: InvoicePayLinkQuery = { ...params };
  const company = (options?.companyName ?? "").trim();
  if (company) query.company = company;
  if (methods && getEnabledCustomerPaymentMethods(methods).length > 0) {
    query.m = encodePaymentMethodsForLink(methods);
  }
  return query;
}

function appendQuery(base: string, query: InvoicePayLinkQuery): string {
  const withScheme = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  const url = new URL(`${withScheme.replace(/\/+$/, "")}/pay`);
  url.searchParams.set("invoice", query.invoice);
  url.searchParams.set("invoice_id", query.invoiceId);
  url.searchParams.set("amount", query.amount);
  url.searchParams.set("amount_cents", query.amountCents);
  if (query.company) url.searchParams.set("company", query.company);
  if (query.m) url.searchParams.set("m", query.m);
  return url.toString();
}

/** Same-device / in-app deep link for demo and universal links. */
export function buildInvoiceAppPayDeepLink(
  invoice: BossInvoice,
  options?: { companyName?: string; methods?: CustomerPaymentMethod[] },
): string {
  const query = buildInvoicePayLinkQuery(invoice, options);
  const params = new URLSearchParams({
    invoiceId: query.invoiceId,
    invoice: query.invoice,
    amount: query.amount,
    amount_cents: query.amountCents,
  });
  if (query.company) params.set("company", query.company);
  if (query.m) params.set("m", query.m);
  return `ideal-solutions://pay?${params.toString()}`;
}

export function buildInvoicePayLinkFromParts(
  invoice: BossInvoice,
  options?: {
    companyName?: string;
    methods?: CustomerPaymentMethod[];
    baseUrl?: string;
  },
): string | null {
  const base = (options?.baseUrl ?? getPayPageBaseUrl()).trim();
  if (!base) return null;
  const query = buildInvoicePayLinkQuery(invoice, options);
  return appendQuery(base, query);
}

/**
 * Customer-facing hosted pay link with invoice summary params and enabled payment methods.
 * Falls back to legacy single-provider link when hosted page is unavailable.
 */
/** Pay link for a single selected provider (direct URL or hosted page with one method). */
export async function buildInvoicePayLinkForMethod(
  invoice: BossInvoice,
  method: CustomerPaymentMethod,
): Promise<string | null> {
  const directUrl = method.payUrl?.trim();
  if (directUrl) {
    return appendInvoiceParamsToPaymentUrl(directUrl, invoicePaymentLinkParams(invoice));
  }

  let companyName = "";
  try {
    const custom = await loadInvoiceCustomization();
    companyName = custom.companyName.trim();
  } catch {
    companyName = "";
  }

  const hosted = buildInvoicePayLinkFromParts(invoice, {
    companyName,
    methods: [method],
  });
  if (hosted) return hosted;

  return buildInvoiceAppPayDeepLink(invoice, {
    companyName,
    methods: [method],
  });
}

export async function buildInvoicePayLink(invoice: BossInvoice): Promise<string | null> {
  const settings = await loadInvoicePaymentSettings();
  const methods = await loadCustomerPaymentMethods();
  const enabled = getEnabledCustomerPaymentMethods(methods);

  let companyName = "";
  try {
    const custom = await loadInvoiceCustomization();
    companyName = custom.companyName.trim();
  } catch {
    companyName = "";
  }

  const hosted = buildInvoicePayLinkFromParts(invoice, {
    companyName,
    methods: enabled,
  });
  if (hosted && enabled.length > 0) return hosted;

  if (settings.enabled && isInvoicePaymentLinkConfigured(settings)) {
    const legacy = buildInvoicePaymentLink(invoice, settings);
    if (legacy) return legacy;
  }

  if (hosted) return hosted;

  return buildInvoiceAppPayDeepLink(invoice, {
    companyName,
    methods: enabled,
  });
}

export function invoicePayLinkPreviewLabel(settings: InvoicePaymentSettings): string {
  if (!settings.enabled) return "Payment links off";
  if (hasHostedPayPage()) return "PAY NOW hosted page";
  if (isInvoicePaymentLinkConfigured(settings)) {
    return `PAY NOW via ${settings.provider}`;
  }
  return "Add payment methods in Settings";
}

/** HTML anchor for email bodies that support HTML. */
export function payNowHtmlAnchor(url: string, label = "PAY NOW"): string {
  const safeUrl = url.replace(/"/g, "&quot;");
  return `<a href="${safeUrl}" style="color:${PAY_GREEN};font-weight:bold">${label}</a>`;
}

export function payNowPlainPrefix(url: string): string {
  return `PAY NOW: ${url}`;
}
