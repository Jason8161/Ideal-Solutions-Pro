import AsyncStorage from "@react-native-async-storage/async-storage";

import { lineAmount, sumAmounts } from "@/lib/accountingMoney";
import type { ServiceCallCustomerFields } from "@/lib/mapPhoneContactToCustomer";
import {
  buildLumpSumLineItems,
  laborRateTableForPricingMode,
} from "@/lib/estimatePricing";
import {
  CREW_ROLE_LABELS,
  parseNumericInput,
  rateForCrewRoleInTable,
  type CrewRoleKey,
  type LaborRateTable,
  type MyCrewSettings,
} from "@/lib/myCrewSettings";
import type { ServiceCallJobCost, ServiceCallRecord } from "@/lib/serviceCallStorage";

const STORAGE_KEY = "ideal_solutions_estimates_v1";
/** Last issued sequential invoice number (integer 1…9999); next issue is last + 1. */
const INVOICE_SEQ_STORAGE_KEY = "ideal_solutions_invoice_seq_v1";

/** Maximum supported sequential invoice number (formatted as four digits). */
export const INVOICE_NUMBER_MAX = 9999;

export type EstimateCustomer = {
  customerName: string;
  company: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
};

export type EstimateLineKind = "material" | "labor" | "other";

/** How labor (or total) is priced on this estimate. */
export type EstimatePricingMode =
  | "project_labor"
  | "service_call_labor"
  | "emergency_labor"
  | "lump_sum";

export type EstimateLineItem = {
  id: string;
  kind: EstimateLineKind;
  description: string;
  quantity: string;
  rate: string;
};

export type EstimateRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  serviceCallId?: string;
  customer: EstimateCustomer;
  /** Labor rate table or lump-sum pricing for this estimate. */
  pricingMode: EstimatePricingMode;
  /** Total contract amount when pricingMode is lump_sum. */
  lumpSumAmount: string;
  lineItems: EstimateLineItem[];
  includeTax: boolean;
  taxPercent: string;
  /** Work to be performed — shown on estimate & invoice PDFs. */
  jobScope: string;
  notes: string;
  invoiceNumber: string;
  /** Contractor: customer has approved this estimate (or you have written approval). */
  approved: boolean;
  /** After customer accepts via link (or you move forward), job is in scheduling phase. */
  schedulingPhase: boolean;
  /** Secret for customer “accept” links in PDF/email (do not share publicly). */
  customerAcceptToken: string;
};

export type EstimateTotals = {
  materials: number;
  labor: number;
  other: number;
  subtotal: number;
  tax: number;
  total: number;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function newCustomerAcceptToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

const PRICING_MODES: EstimatePricingMode[] = [
  "project_labor",
  "service_call_labor",
  "emergency_labor",
  "lump_sum",
];

function normalizePricingMode(value: unknown): EstimatePricingMode {
  if (typeof value === "string" && PRICING_MODES.includes(value as EstimatePricingMode)) {
    return value as EstimatePricingMode;
  }
  return "project_labor";
}

function normalizeEstimateRecord(row: EstimateRecord): EstimateRecord {
  const approved = Boolean(row.approved);
  const schedulingPhase = Boolean(row.schedulingPhase);
  const token =
    typeof row.customerAcceptToken === "string" && row.customerAcceptToken.length >= 12
      ? row.customerAcceptToken
      : newCustomerAcceptToken();
  const invoiceNumber = typeof row.invoiceNumber === "string" ? row.invoiceNumber : "";
  const jobScope = typeof row.jobScope === "string" ? row.jobScope : "";
  const pricingMode = normalizePricingMode(row.pricingMode);
  const lumpSumAmount = typeof row.lumpSumAmount === "string" ? row.lumpSumAmount : "";
  let lineItems = Array.isArray(row.lineItems) ? row.lineItems : [];
  if (pricingMode === "lump_sum" && lineItems.length === 0 && lumpSumAmount.trim()) {
    lineItems = buildLumpSumLineItems(lumpSumAmount);
  }
  return {
    ...row,
    invoiceNumber,
    jobScope,
    approved,
    schedulingPhase,
    customerAcceptToken: token,
    pricingMode,
    lumpSumAmount,
    lineItems,
  };
}

export function newEstimateLineId(): string {
  return newId();
}

export function emptyEstimateCustomer(): EstimateCustomer {
  return {
    customerName: "",
    company: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    phone: "",
  };
}

export function customerFromServiceCallFields(fields: ServiceCallCustomerFields): EstimateCustomer {
  const phone =
    fields.phoneMobile.trim() || fields.phoneHome.trim() || fields.phoneWork.trim();
  return {
    customerName: fields.customerName,
    company: fields.companyName,
    street: fields.street,
    city: fields.city,
    state: fields.state,
    zip: fields.zip,
    email: fields.email.trim() || fields.emailAlt.trim(),
    phone,
  };
}

export function computeEstimateTotals(record: Pick<EstimateRecord, "lineItems" | "includeTax" | "taxPercent">): EstimateTotals {
  let materials = 0;
  let labor = 0;
  let other = 0;
  for (const row of record.lineItems) {
    const amt = lineAmount(row.quantity, row.rate);
    if (row.kind === "material") materials += amt;
    else if (row.kind === "labor") labor += amt;
    else other += amt;
  }
  const subtotal = materials + labor + other;
  const taxPct = record.includeTax ? parseNumericInput(record.taxPercent) : 0;
  const tax = taxPct > 0 ? (subtotal * taxPct) / 100 : 0;
  return { materials, labor, other, subtotal, tax, total: subtotal + tax };
}

async function loadAll(): Promise<EstimateRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const rows = parsed.filter(isEstimateRecord) as EstimateRecord[];
    const normalized = rows.map(normalizeEstimateRecord);
    const needsPersist = rows.some((r) => {
      const t = (r as EstimateRecord).customerAcceptToken;
      return typeof t !== "string" || t.length < 12;
    });
    if (needsPersist) {
      await saveAll(normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

function isEstimateRecord(row: unknown): row is EstimateRecord {
  if (typeof row !== "object" || row === null) return false;
  const r = row as EstimateRecord;
  return (
    typeof r.id === "string" &&
    typeof r.createdAt === "string" &&
    typeof r.updatedAt === "string" &&
    typeof r.customer === "object" &&
    r.customer !== null &&
    Array.isArray(r.lineItems)
  );
}

async function saveAll(records: EstimateRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function loadEstimates(): Promise<EstimateRecord[]> {
  const rows = await loadAll();
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getEstimateById(id: string): Promise<EstimateRecord | null> {
  const rows = await loadAll();
  return rows.find((r) => r.id === id) ?? null;
}

export async function saveEstimate(record: EstimateRecord): Promise<EstimateRecord> {
  const rows = await loadAll();
  const idx = rows.findIndex((r) => r.id === record.id);
  let inv = (record.invoiceNumber ?? "").trim();
  if (!inv) {
    inv = await allocateNextInvoiceNumber();
  } else {
    const dupOther = rows.some((r) => r.id !== record.id && r.invoiceNumber.trim() === inv);
    if (dupOther) {
      inv = await allocateNextInvoiceNumber();
    } else {
      await bumpPersistedSequentialIfNeeded(inv);
    }
  }
  const next = normalizeEstimateRecord({
    ...record,
    invoiceNumber: inv,
    updatedAt: new Date().toISOString(),
  });
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  await saveAll(rows);
  return next;
}

export async function createEstimate(
  partial: Omit<EstimateRecord, "id" | "createdAt" | "updatedAt" | "approved" | "schedulingPhase" | "customerAcceptToken"> &
    Partial<Pick<EstimateRecord, "id" | "approved" | "schedulingPhase" | "customerAcceptToken">>,
): Promise<EstimateRecord> {
  const now = new Date().toISOString();
  const rows = await loadAll();
  const trimmedInvoice = (partial.invoiceNumber ?? "").trim();

  let invoiceNumber: string;
  if (!trimmedInvoice) {
    invoiceNumber = await allocateNextInvoiceNumber();
  } else if (rows.some((r) => r.invoiceNumber.trim() === trimmedInvoice)) {
    invoiceNumber = await allocateNextInvoiceNumber();
  } else {
    invoiceNumber = trimmedInvoice;
    await bumpPersistedSequentialIfNeeded(trimmedInvoice);
  }

  const record: EstimateRecord = normalizeEstimateRecord({
    id: partial.id ?? newId(),
    createdAt: now,
    updatedAt: now,
    serviceCallId: partial.serviceCallId,
    customer: partial.customer,
    pricingMode: partial.pricingMode ?? "project_labor",
    lumpSumAmount: partial.lumpSumAmount ?? "",
    lineItems: partial.lineItems,
    includeTax: partial.includeTax,
    taxPercent: partial.taxPercent,
    jobScope: partial.jobScope ?? "",
    notes: partial.notes ?? "",
    invoiceNumber,
    approved: partial.approved ?? false,
    schedulingPhase: partial.schedulingPhase ?? false,
    customerAcceptToken: partial.customerAcceptToken ?? newCustomerAcceptToken(),
  });
  return saveEstimate(record);
}

export async function deleteEstimate(id: string): Promise<boolean> {
  const rows = await loadAll();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  await saveAll(next);
  return true;
}

export function estimateTitle(record: EstimateRecord): string {
  const name = record.customer.customerName.trim();
  if (name) return name;
  const company = record.customer.company.trim();
  if (company) return company;
  return `Estimate ${record.invoiceNumber || record.id.slice(0, 8)}`;
}

export function formatEstimateDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function estimateSubtitle(record: EstimateRecord): string {
  const totals = computeEstimateTotals(record);
  const parts = [formatEstimateDate(record.updatedAt)];
  parts.push(totals.total.toLocaleString(undefined, { style: "currency", currency: "USD" }));
  if (record.serviceCallId) parts.push("Service call");
  if (record.approved) parts.push("Approved");
  if (record.schedulingPhase) parts.push("Scheduling");
  return parts.join(" · ");
}

/** Parses 1–4 digit strings only (no leading text); values must be 1…9999. */
function parseSequentialInvoiceCounter(invoiceNumber: string): number | null {
  const t = invoiceNumber.trim();
  if (!/^\d{1,4}$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1 || n > INVOICE_NUMBER_MAX) return null;
  return n;
}

async function loadLastIssuedSequential(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(INVOICE_SEQ_STORAGE_KEY);
    if (!raw) return 0;
    const n = Number(JSON.parse(raw) as unknown);
    if (!Number.isInteger(n) || n < 0) return 0;
    return Math.min(n, INVOICE_NUMBER_MAX);
  } catch {
    return 0;
  }
}

async function saveLastIssuedSequential(n: number): Promise<void> {
  await AsyncStorage.setItem(INVOICE_SEQ_STORAGE_KEY, JSON.stringify(n));
}

/** If the user typed a 1–4 digit number, keep the monotonic counter at least that high. */
async function bumpPersistedSequentialIfNeeded(invoiceNumber: string): Promise<void> {
  const v = parseSequentialInvoiceCounter(invoiceNumber);
  if (v === null) return;
  const persisted = await loadLastIssuedSequential();
  if (v > persisted) {
    await saveLastIssuedSequential(Math.min(v, INVOICE_NUMBER_MAX));
  }
}

async function maxSequentialFromEstimates(): Promise<number> {
  const rows = await loadAll();
  let max = 0;
  for (const r of rows) {
    const inv = typeof r.invoiceNumber === "string" ? r.invoiceNumber : "";
    const v = parseSequentialInvoiceCounter(inv);
    if (v !== null && v > max) max = v;
  }
  return max;
}

/**
 * Reserves and returns the next invoice number as zero-padded four digits (`0001` … `9999`).
 * Persists a monotonic counter so deleted estimates do not reuse numbers.
 */
export async function allocateNextInvoiceNumber(): Promise<string> {
  const fromData = await maxSequentialFromEstimates();
  const persisted = await loadLastIssuedSequential();
  const lastIssued = Math.max(fromData, persisted);
  const next = lastIssued + 1;
  if (next > INVOICE_NUMBER_MAX) {
    throw new Error(
      "Invoice numbers cannot go past 9999. Change or remove an existing invoice number, then try again.",
    );
  }
  await saveLastIssuedSequential(next);
  return String(next).padStart(4, "0");
}

/** Next `0001`…`9999` style number that would be issued; does not reserve (safe for UI prefill). */
export async function peekNextInvoiceNumber(): Promise<string> {
  const fromData = await maxSequentialFromEstimates();
  const persisted = await loadLastIssuedSequential();
  const lastIssued = Math.max(fromData, persisted);
  const next = lastIssued + 1;
  if (next > INVOICE_NUMBER_MAX) {
    return String(INVOICE_NUMBER_MAX).padStart(4, "0");
  }
  return String(next).padStart(4, "0");
}

export function sumLineItemsByKind(items: EstimateLineItem[], kind: EstimateLineKind): number {
  return sumAmounts(items.filter((i) => i.kind === kind).map((i) => lineAmount(i.quantity, i.rate)));
}

export function lineItemsFromJobCost(
  jobCost: ServiceCallJobCost,
  settings?: MyCrewSettings,
  rateTable: LaborRateTable = "project",
): EstimateLineItem[] {
  const items: EstimateLineItem[] = [];
  if (jobCost.useManualMaterialTotal) {
    const amt = jobCost.manualMaterialTotal.trim();
    if (amt) {
      items.push({
        id: newEstimateLineId(),
        kind: "material",
        description: "Materials",
        quantity: "1",
        rate: amt,
      });
    }
  } else {
    for (const line of jobCost.materialLines) {
      if (!line.description.trim() && !line.amount.trim()) continue;
      items.push({
        id: newEstimateLineId(),
        kind: "material",
        description: line.description.trim() || "Material",
        quantity: "1",
        rate: line.amount.trim() || "0",
      });
    }
  }
  for (const line of jobCost.laborLines) {
    if (!line.hours.trim() && !line.ratePerHour.trim()) continue;
    const roleLabel = CREW_ROLE_LABELS[line.role as CrewRoleKey] ?? "Labor";
    const role = line.role as CrewRoleKey;
    const rate = settings
      ? rateForCrewRoleInTable(settings, role, rateTable)
      : line.ratePerHour.trim() || "0";
    items.push({
      id: newEstimateLineId(),
      kind: "labor",
      description: `${roleLabel} labor`,
      quantity: line.hours.trim() || "0",
      rate,
    });
  }
  return items;
}

/**
 * Validates the customer accept token and marks the estimate approved + scheduling phase.
 * Idempotent when already accepted.
 */
export async function applyCustomerEstimateAcceptance(params: {
  estimateId: string;
  token: string;
}): Promise<{ ok: true; record: EstimateRecord } | { ok: false; reason: "not_found" | "bad_token" }> {
  const record = await getEstimateById(params.estimateId);
  if (!record) return { ok: false, reason: "not_found" };
  if (record.customerAcceptToken !== params.token) return { ok: false, reason: "bad_token" };
  if (record.approved && record.schedulingPhase) {
    return { ok: true, record };
  }
  const next = normalizeEstimateRecord({
    ...record,
    approved: true,
    schedulingPhase: true,
  });
  return { ok: true, record: await saveEstimate(next) };
}

export async function createEstimateFromServiceCall(
  record: ServiceCallRecord,
  taxPercent: string,
  settings?: MyCrewSettings,
): Promise<EstimateRecord> {
  const pricingMode: EstimatePricingMode = "service_call_labor";
  const rateTable = laborRateTableForPricingMode(pricingMode) ?? "service_call";
  const lineItems = record.jobCost
    ? lineItemsFromJobCost(record.jobCost, settings, rateTable)
    : [];
  return createEstimate({
    serviceCallId: record.id,
    customer: customerFromServiceCallFields(record.fields),
    pricingMode,
    lumpSumAmount: "",
    lineItems,
    includeTax: false,
    taxPercent,
    notes: record.fields.workOrderNotes.trim(),
    jobScope: "",
    invoiceNumber: "",
  });
}
