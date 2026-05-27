import AsyncStorage from "@react-native-async-storage/async-storage";

import { isEmployeeSessionActive } from "@/lib/employeeSession";

import { computeInvoiceTotals } from "./invoiceCalculations";
import { loadBossInvoices } from "./invoiceStorage";
import type { BossInvoice } from "./types";

const OVERDUE_ALERT_SHOWN_DAY_KEY = "ideal_overdue_invoice_alert_day_v1";

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isoDateOnly(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Due date before today with an outstanding balance and not canceled/paid. */
export function isInvoiceOverdue(invoice: BossInvoice): boolean {
  if (invoice.status === "Canceled" || invoice.status === "Paid") return false;
  const totals = computeInvoiceTotals(invoice);
  if (totals.balanceCents <= 0) return false;
  if (!invoice.dueDate.trim()) return false;
  try {
    const due = new Date(invoice.dueDate);
    due.setHours(23, 59, 59, 999);
    return due.getTime() < startOfTodayMs();
  } catch {
    return false;
  }
}

export type OverdueInvoiceSummary = {
  count: number;
  totalBalanceCents: number;
  topCustomerNames: string[];
  invoices: BossInvoice[];
};

export async function loadOverdueInvoiceSummary(): Promise<OverdueInvoiceSummary | null> {
  if (await isEmployeeSessionActive()) return null;
  const invoices = (await loadBossInvoices()).filter(isInvoiceOverdue);
  if (invoices.length === 0) return null;

  const totalBalanceCents = invoices.reduce(
    (sum, inv) => sum + computeInvoiceTotals(inv).balanceCents,
    0,
  );

  const nameCounts = new Map<string, number>();
  for (const inv of invoices) {
    const name = inv.customerName.trim() || inv.jobName.trim() || "Unknown customer";
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const topCustomerNames = [...nameCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name);

  return {
    count: invoices.length,
    totalBalanceCents,
    topCustomerNames,
    invoices,
  };
}

export async function shouldShowOverdueInvoiceAlertToday(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(OVERDUE_ALERT_SHOWN_DAY_KEY);
    return stored !== isoDateOnly();
  } catch {
    return true;
  }
}

export async function markOverdueInvoiceAlertShownToday(): Promise<void> {
  try {
    await AsyncStorage.setItem(OVERDUE_ALERT_SHOWN_DAY_KEY, isoDateOnly());
  } catch {
    /* ignore */
  }
}
