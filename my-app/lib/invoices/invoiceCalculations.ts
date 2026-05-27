import { parseNumericInput } from "@/lib/myCrewSettings";

import { formatCents, lineTotalCents, parseMoneyToCents, sumCents } from "./invoiceMoney";
import type { BossInvoice, InvoiceLineItem, InvoiceStatus } from "./types";

export type InvoiceTotals = {
  lineSubtotalCents: number;
  laborLineCents: number;
  materialLineCents: number;
  otherLineCents: number;
  lumpLaborCents: number;
  lumpMaterialCents: number;
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  paymentsCents: number;
  paidCents: number;
  balanceCents: number;
};

function sumLinesByKind(items: InvoiceLineItem[], kind: InvoiceLineItem["kind"]): number {
  return sumCents(
    items.filter((i) => i.kind === kind).map((i) => lineTotalCents(i.quantity, i.unitPrice)),
  );
}

export function computeInvoiceTotals(invoice: Pick<
  BossInvoice,
  | "lineItems"
  | "laborAmount"
  | "materialAmount"
  | "includeTax"
  | "taxPercent"
  | "discountAmount"
  | "discountPercent"
  | "depositPaid"
  | "payments"
>): InvoiceTotals {
  const laborLineCents = sumLinesByKind(invoice.lineItems, "labor");
  const materialLineCents = sumLinesByKind(invoice.lineItems, "material");
  const otherLineCents = sumLinesByKind(invoice.lineItems, "other");
  const lineSubtotalCents = laborLineCents + materialLineCents + otherLineCents;
  const lumpLaborCents = parseMoneyToCents(invoice.laborAmount);
  const lumpMaterialCents = parseMoneyToCents(invoice.materialAmount);
  const subtotalCents = lineSubtotalCents + lumpLaborCents + lumpMaterialCents;

  const discountFlat = parseMoneyToCents(invoice.discountAmount);
  const discountPct = parseNumericInput(invoice.discountPercent);
  const discountFromPct =
    discountPct > 0 ? Math.round((subtotalCents * discountPct) / 100) : 0;
  const discountCents = discountFlat + discountFromPct;
  const taxableCents = Math.max(0, subtotalCents - discountCents);

  const taxPct = invoice.includeTax ? parseNumericInput(invoice.taxPercent) : 0;
  const taxCents = taxPct > 0 ? Math.round((taxableCents * taxPct) / 100) : 0;
  const totalCents = taxableCents + taxCents;

  const depositCents = parseMoneyToCents(invoice.depositPaid);
  const paymentsCents = sumCents(invoice.payments.map((p) => p.amountCents));
  const paidCents = depositCents + paymentsCents;
  const balanceCents = Math.max(0, totalCents - paidCents);

  return {
    lineSubtotalCents,
    laborLineCents,
    materialLineCents,
    otherLineCents,
    lumpLaborCents,
    lumpMaterialCents,
    subtotalCents,
    discountCents,
    taxableCents,
    taxCents,
    totalCents,
    depositCents,
    paymentsCents,
    paidCents,
    balanceCents,
  };
}

export function formatInvoiceTotals(totals: InvoiceTotals): {
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paid: string;
  balance: string;
} {
  return {
    subtotal: formatCents(totals.subtotalCents),
    discount: formatCents(totals.discountCents),
    tax: formatCents(totals.taxCents),
    total: formatCents(totals.totalCents),
    paid: formatCents(totals.paidCents),
    balance: formatCents(totals.balanceCents),
  };
}

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Suggest status from payments and due date unless user locked Canceled. */
export function deriveInvoiceStatus(
  invoice: BossInvoice,
  manualStatus?: InvoiceStatus,
): InvoiceStatus {
  if (manualStatus === "Canceled") return "Canceled";
  const totals = computeInvoiceTotals(invoice);
  if (totals.balanceCents <= 0 && totals.totalCents > 0) return "Paid";
  if (totals.paymentsCents > 0 || (totals.depositCents > 0 && totals.balanceCents > 0)) {
    if (totals.balanceCents > 0) return "Partial Payment";
  }
  if (invoice.dueDate) {
    try {
      const due = new Date(invoice.dueDate);
      due.setHours(23, 59, 59, 999);
      if (due.getTime() < startOfTodayMs() && totals.balanceCents > 0) return "Overdue";
    } catch {
      /* ignore */
    }
  }
  if (invoice.sentAt || manualStatus === "Sent") return "Sent";
  if (manualStatus && manualStatus !== "Draft") return manualStatus;
  return invoice.status === "Canceled" ? "Canceled" : "Draft";
}
