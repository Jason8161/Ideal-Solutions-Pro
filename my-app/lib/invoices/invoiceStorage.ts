import AsyncStorage from "@react-native-async-storage/async-storage";

import { getBossJobById } from "@/lib/bossMan/jobStorage";
import { getJobPaymentDraws, resolveDrawAmount } from "@/lib/bossMan/paymentDraws";
import type { BossEstimate, PaymentDraw } from "@/lib/bossMan/types";
import { parseNumericInput } from "@/lib/myCrewSettings";

import { computeInvoiceTotals, deriveInvoiceStatus } from "./invoiceCalculations";
import { formatCents } from "./invoiceMoney";
import { loadInvoiceCustomization } from "./invoiceCustomizationStorage";
import {
  DEFAULT_INVOICE_PAYMENT_TERMS,
  resolveInvoicePaymentTerms,
  type BossInvoice,
  type InvoiceLineItem,
  type InvoicePayment,
  type InvoiceStatus,
} from "./types";

export const BOSS_INVOICES_STORAGE_KEY = "ideal_solutions_boss_invoices_v1";
const INVOICE_SEQ_KEY = "ideal_solutions_boss_invoice_seq_v1";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function newInvoiceLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isoDateOnly(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dueDateDefault(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return isoDateOnly(d);
}

export function emptyBossInvoice(): BossInvoice {
  const now = new Date().toISOString();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    invoiceNumber: "",
    status: "Draft",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    jobName: "",
    jobAddress: "",
    invoiceDate: isoDateOnly(),
    dueDate: dueDateDefault(),
    lineItems: [],
    laborAmount: "",
    materialAmount: "",
    includeTax: false,
    taxPercent: "",
    discountAmount: "",
    discountPercent: "",
    depositPaid: "",
    notes: "",
    terms: DEFAULT_INVOICE_PAYMENT_TERMS,
    payments: [],
  };
}

async function loadAll(): Promise<BossInvoice[]> {
  try {
    const raw = await AsyncStorage.getItem(BOSS_INVOICES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeInvoice);
  } catch {
    return [];
  }
}

async function saveAll(rows: BossInvoice[]): Promise<void> {
  await AsyncStorage.setItem(BOSS_INVOICES_STORAGE_KEY, JSON.stringify(rows));
}

function normalizeInvoice(row: BossInvoice): BossInvoice {
  return {
    ...row,
    notes: row.notes ?? "",
    terms: row.terms ?? "",
    lineItems: (row.lineItems ?? []).map((line) => ({
      ...line,
      id: line.id || newInvoiceLineId(),
      kind: line.kind === "labor" || line.kind === "material" ? line.kind : "other",
      description: line.description ?? "",
      quantity: line.quantity ?? "1",
      unitPrice: line.unitPrice ?? "",
    })),
    payments: Array.isArray(row.payments) ? row.payments : [],
    status: row.status ?? "Draft",
  };
}

function parseSeqFromNumber(invoiceNumber: string, prefix: string): number | null {
  const t = invoiceNumber.trim();
  if (!t.startsWith(prefix)) return null;
  const tail = t.slice(prefix.length);
  if (!/^\d{1,4}$/.test(tail)) return null;
  const n = Number(tail);
  if (!Number.isInteger(n) || n < 1 || n > 9999) return null;
  return n;
}

async function loadLastSeq(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(INVOICE_SEQ_KEY);
    if (!raw) return 0;
    const n = Number(JSON.parse(raw) as unknown);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function saveLastSeq(n: number): Promise<void> {
  await AsyncStorage.setItem(INVOICE_SEQ_KEY, JSON.stringify(n));
}

async function maxSeqFromInvoices(prefix: string): Promise<number> {
  const rows = await loadAll();
  let max = 0;
  for (const r of rows) {
    const v = parseSeqFromNumber(r.invoiceNumber, prefix);
    if (v !== null && v > max) max = v;
  }
  return max;
}

export async function peekNextBossInvoiceNumber(): Promise<string> {
  const custom = await loadInvoiceCustomization();
  const prefix = custom.numberingPrefix.trim() || "IES-";
  const fromData = await maxSeqFromInvoices(prefix);
  const persisted = await loadLastSeq();
  const next = Math.max(fromData, persisted) + 1;
  const padded = String(Math.min(next, 9999)).padStart(4, "0");
  return `${prefix}${padded}`;
}

export async function allocateNextBossInvoiceNumber(): Promise<string> {
  const custom = await loadInvoiceCustomization();
  const prefix = custom.numberingPrefix.trim() || "IES-";
  const fromData = await maxSeqFromInvoices(prefix);
  const persisted = await loadLastSeq();
  const next = Math.max(fromData, persisted) + 1;
  if (next > 9999) throw new Error("Invoice numbers cannot exceed 9999 for this prefix.");
  await saveLastSeq(next);
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function loadBossInvoices(): Promise<BossInvoice[]> {
  const rows = await loadAll();
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadBossInvoicesForJob(jobId: string): Promise<BossInvoice[]> {
  return (await loadBossInvoices()).filter((i) => i.jobId === jobId);
}

export async function getBossInvoiceById(id: string): Promise<BossInvoice | null> {
  const rows = await loadAll();
  return rows.find((i) => i.id === id) ?? null;
}

export async function saveBossInvoice(
  invoice: BossInvoice,
  options?: { manualStatus?: InvoiceStatus; markSent?: boolean },
): Promise<BossInvoice> {
  const rows = await loadAll();
  let inv = normalizeInvoice(invoice);
  if (!inv.invoiceNumber.trim()) {
    inv = { ...inv, invoiceNumber: await allocateNextBossInvoiceNumber() };
  }
  const status = deriveInvoiceStatus(inv, options?.manualStatus ?? inv.status);
  const normalized: BossInvoice = {
    ...inv,
    status,
    updatedAt: new Date().toISOString(),
    sentAt: options?.markSent ? new Date().toISOString() : inv.sentAt,
  };
  const idx = rows.findIndex((r) => r.id === normalized.id);
  if (idx >= 0) rows[idx] = normalized;
  else rows.push(normalized);
  await saveAll(rows);
  return normalized;
}

export async function deleteBossInvoice(id: string): Promise<boolean> {
  const rows = await loadAll();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  await saveAll(next);
  return true;
}

export async function duplicateBossInvoice(id: string): Promise<BossInvoice | null> {
  const source = await getBossInvoiceById(id);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: BossInvoice = {
    ...source,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    invoiceNumber: await allocateNextBossInvoiceNumber(),
    status: "Draft",
    sentAt: undefined,
    payments: [],
    depositPaid: "",
  };
  return saveBossInvoice(copy);
}

export function invoiceTitle(invoice: BossInvoice): string {
  const name = invoice.jobName.trim() || invoice.customerName.trim();
  return name || invoice.invoiceNumber || "Invoice";
}

export function invoiceSubtitle(invoice: BossInvoice): string {
  const totals = computeInvoiceTotals(invoice);
  const parts = [invoice.invoiceNumber, INVOICE_STATUS_SHORT[invoice.status] ?? invoice.status];
  parts.push(formatCents(totals.totalCents));
  if (totals.balanceCents > 0) parts.push(`Due ${formatCents(totals.balanceCents)}`);
  return parts.filter(Boolean).join(" · ");
}

const INVOICE_STATUS_SHORT: Partial<Record<InvoiceStatus, string>> = {
  Draft: "Draft",
  Sent: "Sent",
  Paid: "Paid",
  "Partial Payment": "Partial",
  Overdue: "Overdue",
  Canceled: "Canceled",
};

export async function prefillInvoiceFromJob(jobId: string): Promise<BossInvoice> {
  const job = await getBossJobById(jobId);
  const custom = await loadInvoiceCustomization();
  const inv = emptyBossInvoice();
  inv.jobId = jobId;
  if (job) {
    inv.customerName = job.customerName;
    inv.jobName = job.jobName;
    inv.jobAddress = job.address;
    if (job.estimateId) inv.sourceEstimateId = job.estimateId;
  }
  inv.terms = resolveInvoicePaymentTerms(custom.defaultPaymentTerms);
  inv.notes = custom.defaultNotes;
  inv.taxPercent = custom.defaultTaxPercent;
  inv.includeTax = parseNumericInput(custom.defaultTaxPercent) > 0;
  inv.invoiceNumber = await peekNextBossInvoiceNumber();
  return inv;
}

export async function prefillInvoiceFromPaymentDraw(
  jobId: string,
  draw: PaymentDraw,
): Promise<BossInvoice> {
  const job = await getBossJobById(jobId);
  const inv = await prefillInvoiceFromJob(jobId);
  const drawNote = `Payment draw: ${draw.label}`;
  inv.notes = inv.notes?.trim() ? `${inv.notes.trim()}\n${drawNote}` : drawNote;
  const amount = resolveDrawAmount(draw, job?.estimateTotal ?? 0);
  if (amount > 0) {
    inv.lineItems = [
      {
        id: newInvoiceLineId(),
        kind: "other",
        description: draw.label,
        quantity: "1",
        unitPrice: String(amount),
      },
    ];
  }
  return inv;
}

export function bossInvoiceFromBossEstimate(estimate: BossEstimate, jobId?: string): BossInvoice {
  const inv = emptyBossInvoice();
  inv.jobId = jobId;
  inv.sourceEstimateId = estimate.id;
  inv.customerName = estimate.customerName;
  inv.jobName = estimate.jobName;
  inv.jobAddress = estimate.address;
  inv.laborAmount = estimate.laborAmount;
  inv.materialAmount = estimate.materialAmount;
  inv.taxPercent = estimate.taxPercent;
  inv.includeTax = parseNumericInput(estimate.taxPercent) > 0;
  inv.notes = estimate.notes;
  inv.terms = resolveInvoicePaymentTerms(estimate.terms);
  inv.lineItems = estimate.lineItems.map((line) => ({
    id: newInvoiceLineId(),
    kind: "other" as const,
    description: line.description,
    quantity: "1",
    unitPrice: line.amount,
  }));
  return inv;
}

export async function addInvoicePayment(
  invoiceId: string,
  payment: Omit<InvoicePayment, "id">,
): Promise<BossInvoice | null> {
  const inv = await getBossInvoiceById(invoiceId);
  if (!inv) return null;
  const row: InvoicePayment = { ...payment, id: newId() };
  return saveBossInvoice({ ...inv, payments: [...inv.payments, row] });
}

export async function markInvoicePaid(invoiceId: string): Promise<BossInvoice | null> {
  const inv = await getBossInvoiceById(invoiceId);
  if (!inv) return null;
  const totals = computeInvoiceTotals(inv);
  if (totals.balanceCents <= 0) {
    return saveBossInvoice({ ...inv, status: "Paid" }, { manualStatus: "Paid" });
  }
  const payment: InvoicePayment = {
    id: newId(),
    amountCents: totals.balanceCents,
    receivedAt: isoDateOnly(),
    method: "Other",
    note: "Marked paid",
  };
  return saveBossInvoice(
    { ...inv, payments: [...inv.payments, payment], status: "Paid" },
    { manualStatus: "Paid" },
  );
}
