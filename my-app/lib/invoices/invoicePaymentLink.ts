import { computeInvoiceTotals } from "./invoiceCalculations";
import {
  INVOICE_PAYMENT_PROVIDER_LABELS,
  isInvoicePaymentLinkConfigured,
  isRemoteInvoicePaymentProvider,
  loadInvoicePaymentSettings,
  type InvoicePaymentSettings,
} from "./invoicePaymentSettingsStorage";
import type { BossInvoice } from "./types";

export type InvoicePaymentLinkParams = {
  invoice: string;
  invoiceId: string;
  /** Balance due in major currency units (e.g. 500.00 for five hundred dollars). */
  amount: string;
  /** Balance due in cents for providers that prefer integer amounts. */
  amountCents: string;
};

export function invoicePaymentLinkParams(invoice: BossInvoice): InvoicePaymentLinkParams {
  const totals = computeInvoiceTotals(invoice);
  const invoiceRef = invoice.invoiceNumber.trim() || invoice.id;
  const amountMajor = (totals.balanceCents / 100).toFixed(2);
  return {
    invoice: invoiceRef,
    invoiceId: invoice.id,
    amount: amountMajor,
    amountCents: String(totals.balanceCents),
  };
}

export function appendInvoiceParamsToPaymentUrl(
  baseUrl: string,
  params: InvoicePaymentLinkParams,
): string {
  return appendQueryParams(baseUrl, params);
}

function appendQueryParams(baseUrl: string, params: InvoicePaymentLinkParams): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    url.searchParams.set("invoice", params.invoice);
    url.searchParams.set("invoice_id", params.invoiceId);
    url.searchParams.set("amount", params.amount);
    url.searchParams.set("amount_cents", params.amountCents);
    return url.toString();
  } catch {
    const separator = trimmed.includes("?") ? "&" : "?";
    const query = new URLSearchParams({
      invoice: params.invoice,
      invoice_id: params.invoiceId,
      amount: params.amount,
      amount_cents: params.amountCents,
    }).toString();
    return `${trimmed}${separator}${query}`;
  }
}

/**
 * Builds a customer-facing pay link from saved settings and invoice details.
 * Returns null when payment links are disabled or no base URL is configured.
 *
 * Phase 2: replace paste-URL flow with Stripe/Square API-created links per invoice.
 */
export function buildInvoicePaymentLink(
  invoice: BossInvoice,
  settings: InvoicePaymentSettings,
): string | null {
  if (!settings.enabled || !isRemoteInvoicePaymentProvider(settings.provider)) {
    return null;
  }
  if (!isInvoicePaymentLinkConfigured(settings)) {
    return null;
  }
  return appendQueryParams(settings.paymentLinkBaseUrl, invoicePaymentLinkParams(invoice));
}

export async function loadInvoicePaymentLink(invoice: BossInvoice): Promise<string | null> {
  const settings = await loadInvoicePaymentSettings();
  return buildInvoicePaymentLink(invoice, settings);
}

export function invoicePaymentLinkPreviewLabel(settings: InvoicePaymentSettings): string {
  if (!settings.enabled) return "Payment links off";
  if (settings.provider === "tap_to_pay") {
    return "Tap to Pay — in person (no remote pay link)";
  }
  if (!isInvoicePaymentLinkConfigured(settings)) return "Add payment URL in Settings";
  return INVOICE_PAYMENT_PROVIDER_LABELS[settings.provider];
}
