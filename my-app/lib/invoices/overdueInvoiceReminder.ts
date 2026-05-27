import { Alert, Linking, Platform, Share } from "react-native";

import { computeInvoiceTotals } from "./invoiceCalculations";
import { loadInvoiceShareContact, type InvoiceShareContact } from "./invoiceCustomerShare";
import { formatCents } from "./invoiceMoney";
import type { OverdueInvoiceSummary } from "./overdueInvoices";
import type { BossInvoice } from "./types";

function formatDueDate(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return "";
  try {
    return new Date(trimmed).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return trimmed;
  }
}

function customerLabel(invoice: BossInvoice): string {
  return invoice.customerName.trim() || invoice.jobName.trim() || "there";
}

export function buildOverdueInvoiceReminderMessage(
  invoice: BossInvoice,
  contact: InvoiceShareContact,
): string {
  const totals = computeInvoiceTotals(invoice);
  const company = contact.companyName || "Our company";
  const customer = customerLabel(invoice);
  const due = formatDueDate(invoice.dueDate);
  const lines = [
    `Hi ${customer},`,
    "",
    `This is a friendly payment reminder from ${company}.`,
    "",
    `Invoice ${invoice.invoiceNumber || "(no number)"}`,
    `Amount due: ${formatCents(totals.balanceCents)}`,
    due ? `Due date: ${due}` : "",
    invoice.jobName.trim() ? `Job: ${invoice.jobName.trim()}` : "",
    "",
    "If you have already sent payment, thank you — please disregard this message.",
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

export function buildOverdueInvoicesBatchReminderMessage(
  invoices: BossInvoice[],
  contact: InvoiceShareContact,
): string {
  const company = contact.companyName || "Our company";
  const customer = customerLabel(invoices[0]!);
  const totalBalanceCents = invoices.reduce(
    (sum, inv) => sum + computeInvoiceTotals(inv).balanceCents,
    0,
  );
  const bulletLines = invoices.map((inv) => {
    const totals = computeInvoiceTotals(inv);
    const due = formatDueDate(inv.dueDate);
    const duePart = due ? ` · due ${due}` : "";
    return `• ${inv.invoiceNumber || "Invoice"} — ${formatCents(totals.balanceCents)}${duePart}`;
  });

  const lines = [
    `Hi ${customer},`,
    "",
    `This is a friendly payment reminder from ${company} about the following overdue invoice${invoices.length === 1 ? "" : "s"}:`,
    "",
    ...bulletLines,
    "",
    `Total outstanding: ${formatCents(totalBalanceCents)}`,
    "",
    "If you have already sent payment, thank you — please disregard this message.",
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

type CustomerReminderGroup = {
  label: string;
  phone: string;
  email: string;
  invoices: BossInvoice[];
};

function groupOverdueByCustomer(invoices: BossInvoice[]): CustomerReminderGroup[] {
  const map = new Map<string, CustomerReminderGroup>();
  for (const inv of invoices) {
    const label = inv.customerName.trim() || inv.jobName.trim() || "Unknown customer";
    const phone = inv.customerPhone.trim();
    const email = inv.customerEmail.trim();
    const key = `${label.toLowerCase()}\0${phone}\0${email}`;
    const existing = map.get(key);
    if (existing) {
      existing.invoices.push(inv);
    } else {
      map.set(key, { label, phone, email, invoices: [inv] });
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

async function shareGenericReminder(message: string): Promise<void> {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: "Payment reminder", text: message });
    return;
  }
  await Share.share({ title: "Payment reminder", message });
}

async function openReminderEmail(
  message: string,
  invoice: BossInvoice,
  contact: InvoiceShareContact,
  recipientEmail?: string,
): Promise<void> {
  const company = contact.companyName || "Payment reminder";
  const subject = encodeURIComponent(`Payment reminder — ${company}`.trim());
  const body = encodeURIComponent(message);
  const to = encodeURIComponent((recipientEmail ?? invoice.customerEmail).trim());
  const mailto = to ? `mailto:${to}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
  if (await Linking.canOpenURL(mailto)) {
    await Linking.openURL(mailto);
    return;
  }
  await shareGenericReminder(message);
}

async function openReminderSms(
  message: string,
  invoice: BossInvoice,
  contact: InvoiceShareContact,
  recipientPhone?: string,
): Promise<void> {
  const body = encodeURIComponent(message);
  const digits = (recipientPhone ?? invoice.customerPhone).replace(/[^\d+]/g, "");
  const sms = digits ? `sms:${digits}?body=${body}` : `sms:?body=${body}`;
  if (Platform.OS !== "web" && (await Linking.canOpenURL(sms))) {
    await Linking.openURL(sms);
    return;
  }
  await shareGenericReminder(message);
}

function confirmMissingContact(channel: "sms" | "email"): void {
  Alert.alert(
    channel === "sms" ? "No phone number" : "No email address",
    channel === "sms"
      ? "Add the customer phone on the invoice before sending by text."
      : "Add the customer email on the invoice before sending by email.",
  );
}

async function sendReminderForInvoices(
  invoices: BossInvoice[],
  channel: "sms" | "email" | "share",
  contact: InvoiceShareContact,
): Promise<void> {
  const primary = invoices[0]!;
  const message =
    invoices.length === 1
      ? buildOverdueInvoiceReminderMessage(primary, contact)
      : buildOverdueInvoicesBatchReminderMessage(invoices, contact);

  if (channel === "share") {
    await shareGenericReminder(message);
    return;
  }

  const phone = primary.customerPhone.trim();
  const email = primary.customerEmail.trim();

  if (channel === "sms" && !phone) {
    confirmMissingContact("sms");
    return;
  }
  if (channel === "email" && !email) {
    confirmMissingContact("email");
    return;
  }

  if (channel === "email") {
    await openReminderEmail(message, primary, contact, email);
  } else {
    await openReminderSms(message, primary, contact, phone);
  }
}

function promptReminderChannel(onPick: (channel: "sms" | "email" | "share") => void): void {
  Alert.alert(
    "Send reminder",
    "How would you like to send the payment reminder?",
    [
      { text: "Text", onPress: () => onPick("sms") },
      { text: "Email", onPress: () => onPick("email") },
      { text: "Share…", onPress: () => onPick("share") },
    ],
    { cancelable: true },
  );
}

function promptCustomerGroup(
  groups: CustomerReminderGroup[],
  onPick: (group: CustomerReminderGroup) => void,
): void {
  if (groups.length === 1) {
    onPick(groups[0]!);
    return;
  }

  const maxChoices = Platform.OS === "android" ? 2 : 5;
  const choices = groups.slice(0, maxChoices);
  const extra = groups.length - choices.length;
  const buttons = choices.map((group) => ({
    text: `${group.label} (${group.invoices.length})`,
    onPress: () => onPick(group),
  }));

  Alert.alert(
    "Choose customer",
    extra > 0
      ? `${groups.length} customers have overdue invoices. Pick one to remind (${extra} more in your overdue invoice list).`
      : `${groups.length} customers have overdue invoices. Send a reminder to one customer at a time.`,
    buttons,
    { cancelable: true },
  );
}

/** Opens SMS/email/share with a polite overdue payment reminder. */
export function promptSendOverdueInvoiceReminders(summary: OverdueInvoiceSummary): void {
  const groups = groupOverdueByCustomer(summary.invoices);

  promptReminderChannel((channel) => {
    void (async () => {
      const contact = await loadInvoiceShareContact();

      if (groups.length === 1) {
        await sendReminderForInvoices(groups[0]!.invoices, channel, contact);
        return;
      }

      promptCustomerGroup(groups, (group) => {
        void sendReminderForInvoices(group.invoices, channel, contact);
      });
    })();
  });
}
