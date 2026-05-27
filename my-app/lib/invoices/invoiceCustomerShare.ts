import { Alert, Linking, Platform, Share } from "react-native";
import { router, type Href } from "expo-router";

import { computeInvoiceTotals } from "./invoiceCalculations";
import { formatCents } from "./invoiceMoney";
import { loadInvoiceCustomization } from "./invoiceCustomizationStorage";
import { shareBossInvoicePdf } from "./bossInvoicePdf";
import {
  getEnabledCustomerPaymentMethods,
  loadCustomerPaymentMethods,
} from "./customerPaymentMethodsStorage";
import {
  buildInvoicePayLink,
  hasHostedPayPage,
  payNowHtmlAnchor,
  payNowPlainPrefix,
} from "./invoicePayLink";
import {
  buildInvoicePayLinkForSendOption,
  loadInvoiceSendPaymentOptions,
  pickInvoiceSendPaymentOption,
  type InvoiceSendPaymentOption,
} from "./invoiceSendPaymentPicker";
import {
  isInvoicePaymentLinkConfigured,
  loadInvoicePaymentSettings,
} from "./invoicePaymentSettingsStorage";
import { saveBossInvoice } from "./invoiceStorage";
import type { BossInvoice } from "./types";

export const INVOICE_PAYMENT_SETTINGS_HREF = "/settings/invoice-payments" as Href;

export type InvoiceShareContact = {
  companyName: string;
  phone: string;
  email: string;
};

export async function loadInvoiceShareContact(): Promise<InvoiceShareContact> {
  const custom = await loadInvoiceCustomization();
  return {
    companyName: custom.companyName.trim(),
    phone: custom.phone.trim(),
    email: custom.email.trim(),
  };
}

export function buildInvoiceCustomerMessage(
  invoice: BossInvoice,
  contact: InvoiceShareContact,
  paymentUrl?: string | null,
): string {
  const totals = computeInvoiceTotals(invoice);
  const company = contact.companyName || "Our company";
  const customer = invoice.customerName.trim() || "there";
  const payLink = paymentUrl?.trim() || "";
  const lines = [
    `Hi ${customer},`,
    "",
    `${company} has sent you invoice ${invoice.invoiceNumber || "(draft)"}.`,
    "",
    `Total: ${formatCents(totals.totalCents)}`,
    `Balance due: ${formatCents(totals.balanceCents)}`,
    invoice.dueDate.trim() ? `Due: ${invoice.dueDate.trim()}` : "",
    invoice.jobName.trim() ? `Job: ${invoice.jobName.trim()}` : "",
    "",
    ...(payLink ? [payNowPlainPrefix(payLink), ""] : []),
    "Attach the invoice PDF from Ideal Solutions Pro (use Share invoice PDF in the app) for line items and payment details.",
    "",
    contact.phone ? `Questions? ${contact.phone}` : "",
    contact.email ? `Email: ${contact.email}` : "",
    "",
    "Thank you,",
    company,
    "",
    "— Sent via Ideal Solutions Pro",
  ].filter(Boolean);
  return lines.join("\n");
}

/** HTML email body with green bold PAY NOW anchor (for clients that support HTML). */
export function buildInvoiceCustomerHtmlMessage(
  invoice: BossInvoice,
  contact: InvoiceShareContact,
  paymentUrl?: string | null,
): string {
  const totals = computeInvoiceTotals(invoice);
  const company = contact.companyName || "Our company";
  const customer = invoice.customerName.trim() || "there";
  const payLink = paymentUrl?.trim() || "";
  const payBlock = payLink
    ? `<p>${payNowHtmlAnchor(payLink)}</p><p style="font-size:13px;color:#64748b">${payLink}</p>`
    : "";
  return [
    `<p>Hi ${customer},</p>`,
    `<p>${company} has sent you invoice <strong>${invoice.invoiceNumber || "(draft)"}</strong>.</p>`,
    `<p>Total: ${formatCents(totals.totalCents)}<br/>Balance due: <strong>${formatCents(totals.balanceCents)}</strong></p>`,
    invoice.dueDate.trim() ? `<p>Due: ${invoice.dueDate.trim()}</p>` : "",
    invoice.jobName.trim() ? `<p>Job: ${invoice.jobName.trim()}</p>` : "",
    payBlock,
    "<p>See the attached invoice PDF for line items and payment details.</p>",
    contact.phone ? `<p>Questions? ${contact.phone}</p>` : "",
    contact.email ? `<p>Email: ${contact.email}</p>` : "",
    `<p>Thank you,<br/>${company}</p>`,
    "<p><em>— Sent via Ideal Solutions Pro</em></p>",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function buildInvoiceCustomerMessageWithPayment(
  invoice: BossInvoice,
  contact: InvoiceShareContact,
): Promise<{ message: string; htmlMessage: string; paymentUrl: string | null }> {
  const paymentUrl = await buildInvoicePayLink(invoice);
  return {
    message: buildInvoiceCustomerMessage(invoice, contact, paymentUrl),
    htmlMessage: buildInvoiceCustomerHtmlMessage(invoice, contact, paymentUrl),
    paymentUrl,
  };
}

export function buildInvoiceCustomerMailtoUrl(
  invoice: BossInvoice,
  contact: InvoiceShareContact,
  recipientEmail?: string,
  paymentUrl?: string | null,
): string {
  const company = contact.companyName || "Invoice";
  const subject = encodeURIComponent(
    `Invoice ${invoice.invoiceNumber || ""} — ${company}`.trim(),
  );
  const body = encodeURIComponent(buildInvoiceCustomerMessage(invoice, contact, paymentUrl));
  const to = encodeURIComponent((recipientEmail ?? invoice.customerEmail).trim());
  return to ? `mailto:${to}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
}

export function buildInvoiceCustomerSmsUrl(
  invoice: BossInvoice,
  contact: InvoiceShareContact,
  recipientPhone?: string,
  paymentUrl?: string | null,
): string {
  const body = encodeURIComponent(buildInvoiceCustomerMessage(invoice, contact, paymentUrl));
  const digits = (recipientPhone ?? invoice.customerPhone).replace(/[^\d+]/g, "");
  return digits ? `sms:${digits}?body=${body}` : `sms:?body=${body}`;
}

async function shareGenericMessage(message: string, htmlMessage?: string): Promise<void> {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
    const shareData: ShareData = { title: "Invoice", text: message };
    if (htmlMessage && "canShare" in navigator) {
      try {
        const blob = new Blob([htmlMessage], { type: "text/html" });
        const file = new File([blob], "invoice.html", { type: "text/html" });
        const withHtml = { ...shareData, files: [file] };
        if (navigator.canShare(withHtml)) {
          await navigator.share(withHtml);
          return;
        }
      } catch {
        /* fall through to text */
      }
    }
    await navigator.share(shareData);
    return;
  }
  await Share.share({ title: "Invoice", message });
}

export async function openInvoiceCustomerEmail(
  invoice: BossInvoice,
  contact: InvoiceShareContact,
  paymentUrl?: string | null,
): Promise<boolean> {
  const resolvedUrl = paymentUrl ?? (await buildInvoicePayLink(invoice));
  const message = buildInvoiceCustomerMessage(invoice, contact, resolvedUrl);
  const htmlMessage = buildInvoiceCustomerHtmlMessage(invoice, contact, resolvedUrl);
  const mailto = buildInvoiceCustomerMailtoUrl(invoice, contact, undefined, resolvedUrl);
  if (await Linking.canOpenURL(mailto)) {
    await Linking.openURL(mailto);
    return true;
  }
  await shareGenericMessage(message, htmlMessage);
  return false;
}

export async function openInvoiceCustomerSms(
  invoice: BossInvoice,
  contact: InvoiceShareContact,
  paymentUrl?: string | null,
): Promise<boolean> {
  const resolvedUrl = paymentUrl ?? (await buildInvoicePayLink(invoice));
  const message = buildInvoiceCustomerMessage(invoice, contact, resolvedUrl);
  const sms = buildInvoiceCustomerSmsUrl(invoice, contact, undefined, resolvedUrl);
  if (Platform.OS !== "web" && (await Linking.canOpenURL(sms))) {
    await Linking.openURL(sms);
    return true;
  }
  await shareGenericMessage(message);
  return false;
}

function promptInvoicePaymentSetup(onContinue: () => void): void {
  Alert.alert(
    "Payment link not set up",
    "Invoice PAY NOW links are turned on but no payment methods or URL are configured. Set up Settings → Payment methods or Invoice payments, or send without a pay link.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          router.push(INVOICE_PAYMENT_SETTINGS_HREF);
        },
      },
      { text: "Send without link", onPress: onContinue },
    ],
  );
}

async function resolveInvoiceSendPaymentUrl(invoice: BossInvoice): Promise<{
  paymentUrl: string | null;
  needsSetupPrompt: boolean;
  sendOptions: InvoiceSendPaymentOption[];
}> {
  const settings = await loadInvoicePaymentSettings();
  if (!settings.enabled) {
    return { paymentUrl: null, needsSetupPrompt: false, sendOptions: [] };
  }

  const sendOptions = await loadInvoiceSendPaymentOptions();
  const methods = await loadCustomerPaymentMethods();
  const enabledMethods = getEnabledCustomerPaymentMethods(methods);
  const payUrl = await buildInvoicePayLink(invoice);

  const hasLegacy = isInvoicePaymentLinkConfigured(settings);
  const hasHosted = hasHostedPayPage() && enabledMethods.length > 0;
  const configured =
    sendOptions.length > 0 ||
    (Boolean(payUrl) && (hasLegacy || hasHosted || enabledMethods.length > 0));

  return {
    paymentUrl: payUrl,
    needsSetupPrompt: !configured,
    sendOptions,
  };
}

export function promptShareInvoicePdfAfterInvite(
  invoice: BossInvoice,
  channel: "sms" | "email",
): void {
  Alert.alert(
    "Attach invoice PDF",
    `Your ${channel === "sms" ? "Messages" : "mail"} app cannot attach the PDF automatically. Share the invoice PDF next and choose ${channel === "sms" ? "Messages" : "Mail"} to attach it.`,
    [
      { text: "Later", style: "cancel" },
      {
        text: "Share invoice PDF",
        onPress: () => {
          void shareBossInvoicePdf(invoice).catch((e) => {
            Alert.alert("PDF", e instanceof Error ? e.message : "Could not share PDF.");
          });
        },
      },
    ],
  );
}

function confirmMissingContact(channel: "sms" | "email"): void {
  Alert.alert(
    channel === "sms" ? "No phone number" : "No email address",
    channel === "sms"
      ? "Add the customer phone on this invoice before sending by text."
      : "Add the customer email on this invoice before sending by email.",
  );
}

export async function sendInvoiceToCustomer(
  invoice: BossInvoice,
  channel: "sms" | "email",
  options?: {
    pdfSharedThisSession?: boolean;
    markSent?: boolean;
  },
): Promise<BossInvoice | null> {
  if (channel === "sms" && !invoice.customerPhone.trim()) {
    confirmMissingContact("sms");
    return null;
  }
  if (channel === "email" && !invoice.customerEmail.trim()) {
    confirmMissingContact("email");
    return null;
  }

  const contact = await loadInvoiceShareContact();
  const { paymentUrl: defaultPayUrl, needsSetupPrompt, sendOptions } =
    await resolveInvoiceSendPaymentUrl(invoice);
  let saved = invoice;
  if (options?.markSent !== false) {
    saved = await saveBossInvoice(invoice, { markSent: true, manualStatus: "Sent" });
  }

  const open = (url: string | null) =>
    channel === "email"
      ? () => openInvoiceCustomerEmail(saved, contact, url)
      : () => openInvoiceCustomerSms(saved, contact, url);

  const runOpenFlow = (url: string | null) => {
    const doOpen = open(url);
    if (!options?.pdfSharedThisSession) {
      Alert.alert(
        "Share PDF first?",
        `You can ${channel === "sms" ? "text" : "email"} a summary now, then share the invoice PDF from Ideal Solutions Pro so the customer has the full document.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: channel === "sms" ? "Send text first" : "Send email first",
            onPress: () => {
              void (async () => {
                await doOpen();
                promptShareInvoicePdfAfterInvite(saved, channel);
              })();
            },
          },
          {
            text: "Share PDF first",
            onPress: () => {
              void shareBossInvoicePdf(saved)
                .then(() => {
                  void doOpen();
                })
                .catch((e) => {
                  Alert.alert("PDF", e instanceof Error ? e.message : "Could not share PDF.");
                });
            },
          },
        ],
      );
      return;
    }

    void doOpen();
    if (!options?.pdfSharedThisSession) {
      promptShareInvoicePdfAfterInvite(saved, channel);
    }
  };

  if (needsSetupPrompt) {
    promptInvoicePaymentSetup(() => runOpenFlow(null));
    return saved;
  }

  if (sendOptions.length > 0) {
    const option = await pickInvoiceSendPaymentOption(sendOptions);
    if (!option) return saved;
    const paymentUrl = await buildInvoicePayLinkForSendOption(saved, option);
    runOpenFlow(paymentUrl);
    return saved;
  }

  runOpenFlow(defaultPayUrl);
  return saved;
}

export function savedInvoiceSendAlert(invoice: BossInvoice, onSend: (channel: "sms" | "email") => void): void {
  Alert.alert(
    "Saved",
    `Invoice ${invoice.invoiceNumber} saved. Send a copy to the customer?`,
    [
      { text: "Done", style: "cancel" },
      { text: "Send by text", onPress: () => onSend("sms") },
      { text: "Send by email", onPress: () => onSend("email") },
    ],
  );
}
