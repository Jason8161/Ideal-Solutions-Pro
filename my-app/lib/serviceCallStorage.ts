import AsyncStorage from "@react-native-async-storage/async-storage";

import { lineAmount, sumAmounts } from "@/lib/accountingMoney";
import { buildISOFromDayAndTime } from "@/lib/appointmentStorage";
import type { ServiceRequestPriority } from "@/lib/serviceRequestApi";
import type { ServiceCallCustomerFields } from "@/lib/mapPhoneContactToCustomer";
import type { CrewRoleKey } from "@/lib/myCrewSettings";
import { parseNumericInput } from "@/lib/myCrewSettings";

const STORAGE_KEY = "ideal_solutions_service_calls_v1";

export type ServiceCallStatus = "current" | "completed";

export type ServiceCallWorkflowStatus =
  | "new"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "canceled";

export type ServiceCallSource = "manual" | "customer_link";

export type ServiceCallCompletion = {
  isFullyComplete: boolean;
  isCustomerSatisfied: boolean;
  problemDescription: string;
  fixDescription: string;
  completedAt: string;
};

export type JobCostMaterialLine = {
  id: string;
  description: string;
  amount: string;
};

export type JobCostLaborLine = {
  id: string;
  role: CrewRoleKey;
  hours: string;
  ratePerHour: string;
};

export type ServiceCallJobCost = {
  materialLines: JobCostMaterialLine[];
  useManualMaterialTotal: boolean;
  manualMaterialTotal: string;
  laborLines: JobCostLaborLine[];
  notes: string;
  updatedAt: string;
};

export type JobCostTotals = {
  materials: number;
  labor: number;
  total: number;
};

export type ServiceCallRecord = {
  id: string;
  createdAt: string;
  status: ServiceCallStatus;
  fields: ServiceCallCustomerFields;
  /** Local calendar date for the scheduled visit (YYYY-MM-DD). */
  scheduledDayKey?: string;
  /** Local start time for the visit (24-hour HH:MM). */
  scheduledTimeLocal?: string;
  completion?: ServiceCallCompletion;
  jobCost?: ServiceCallJobCost;
  /** Customer-facing workflow (New → Scheduled → In Progress → Completed / Canceled). */
  workflowStatus?: ServiceCallWorkflowStatus;
  source?: ServiceCallSource;
  /** pricing-backend service request id when imported from customer link. */
  remoteRequestId?: string;
  priority?: ServiceRequestPriority;
  bestTimeToContact?: string;
  /** ISO timestamp when the customer submitted via web form. */
  customerSubmittedAt?: string;
  /** data: URLs or file URIs for photos attached to the request. */
  photoDataUrls?: string[];
  /** Reserved: booking calendar, auto-reply, estimate/invoice, push, payment links */
  futureMeta?: Record<string, unknown>;
};

export type CompletedPeriod = "week" | "month" | "3months" | "6months";

export const COMPLETED_PERIOD_LABELS: Record<CompletedPeriod, string> = {
  week: "Last week",
  month: "Last month",
  "3months": "Last 3 months",
  "6months": "Last 6 months",
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function loadAll(): Promise<ServiceCallRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ServiceCallRecord[];
  } catch {
    return [];
  }
}

async function saveAll(records: ServiceCallRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function loadServiceCalls(): Promise<ServiceCallRecord[]> {
  const rows = await loadAll();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadCurrentServiceCalls(): Promise<ServiceCallRecord[]> {
  return (await loadServiceCalls()).filter((r) => r.status === "current");
}

export async function loadCompletedServiceCalls(period: CompletedPeriod): Promise<ServiceCallRecord[]> {
  const start = periodStart(period);
  return (await loadServiceCalls()).filter((r) => {
    if (r.status !== "completed" || !r.completion?.completedAt) return false;
    return new Date(r.completion.completedAt) >= start;
  });
}

export async function getServiceCallById(id: string): Promise<ServiceCallRecord | null> {
  const rows = await loadAll();
  return rows.find((r) => r.id === id) ?? null;
}

export async function getServiceCallByRemoteRequestId(
  remoteRequestId: string,
): Promise<ServiceCallRecord | null> {
  const id = remoteRequestId.trim();
  if (!id) return null;
  const rows = await loadAll();
  return rows.find((r) => r.remoteRequestId === id) ?? null;
}

export async function removeServiceCallByRemoteRequestId(
  remoteRequestId: string,
): Promise<boolean> {
  const id = remoteRequestId.trim();
  if (!id) return false;
  const rows = await loadAll();
  const next = rows.filter((r) => r.remoteRequestId !== id);
  if (next.length === rows.length) return false;
  await saveAll(next);
  return true;
}

export type AddServiceCallOptions = {
  source?: ServiceCallSource;
  remoteRequestId?: string;
  workflowStatus?: ServiceCallWorkflowStatus;
  priority?: ServiceRequestPriority;
  bestTimeToContact?: string;
  customerSubmittedAt?: string;
  photoDataUrls?: string[];
};

export async function addServiceCall(
  fields: ServiceCallCustomerFields,
  schedule?: { scheduledDayKey: string; scheduledTimeLocal: string },
  options?: AddServiceCallOptions,
): Promise<ServiceCallRecord> {
  const record: ServiceCallRecord = {
    id: newId(),
    createdAt: new Date().toISOString(),
    status: "current",
    fields,
    scheduledDayKey: (schedule?.scheduledDayKey ?? "").trim(),
    scheduledTimeLocal: (schedule?.scheduledTimeLocal ?? "").trim(),
    workflowStatus: options?.workflowStatus ?? "new",
    source: options?.source ?? "manual",
    remoteRequestId: options?.remoteRequestId?.trim() || undefined,
    priority: options?.priority,
    bestTimeToContact: options?.bestTimeToContact?.trim() || undefined,
    customerSubmittedAt: options?.customerSubmittedAt,
    photoDataUrls: options?.photoDataUrls?.length ? options.photoDataUrls : undefined,
  };
  const rows = await loadAll();
  rows.push(record);
  await saveAll(rows);
  return record;
}

export function computeJobCostTotals(jobCost: ServiceCallJobCost | undefined): JobCostTotals {
  if (!jobCost) return { materials: 0, labor: 0, total: 0 };
  const materials = jobCost.useManualMaterialTotal
    ? parseNumericInput(jobCost.manualMaterialTotal)
    : sumAmounts(jobCost.materialLines.map((l) => parseNumericInput(l.amount)));
  const labor = sumAmounts(
    jobCost.laborLines.map((l) => lineAmount(l.hours, l.ratePerHour)),
  );
  return { materials, labor, total: materials + labor };
}

export function newJobCostMaterialLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newJobCostLaborLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function emptyServiceCallJobCost(): ServiceCallJobCost {
  return {
    materialLines: [],
    useManualMaterialTotal: false,
    manualMaterialTotal: "",
    laborLines: [],
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

export async function updateServiceCallWorkflowStatus(
  id: string,
  workflowStatus: ServiceCallWorkflowStatus,
): Promise<ServiceCallRecord | null> {
  const rows = await loadAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated: ServiceCallRecord = { ...rows[idx], workflowStatus };
  rows[idx] = updated;
  await saveAll(rows);
  return updated;
}

export async function updateServiceCall(
  id: string,
  update: {
    fields: ServiceCallCustomerFields;
    scheduledDayKey: string;
    scheduledTimeLocal: string;
  },
): Promise<ServiceCallRecord | null> {
  const rows = await loadAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const prev = rows[idx];
  const updated: ServiceCallRecord = {
    ...prev,
    fields: update.fields,
    scheduledDayKey: update.scheduledDayKey.trim(),
    scheduledTimeLocal: update.scheduledTimeLocal.trim(),
  };
  rows[idx] = updated;
  await saveAll(rows);
  return updated;
}

export async function updateServiceCallJobCost(
  id: string,
  jobCost: ServiceCallJobCost,
): Promise<ServiceCallRecord | null> {
  const rows = await loadAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated: ServiceCallRecord = {
    ...rows[idx],
    jobCost: { ...jobCost, updatedAt: new Date().toISOString() },
  };
  rows[idx] = updated;
  await saveAll(rows);
  return updated;
}

export async function markServiceCallCompleted(
  id: string,
  completion: Omit<ServiceCallCompletion, "completedAt">,
): Promise<ServiceCallRecord | null> {
  const rows = await loadAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated: ServiceCallRecord = {
    ...rows[idx],
    status: "completed",
    completion: {
      ...completion,
      completedAt: new Date().toISOString(),
    },
  };
  rows[idx] = updated;
  await saveAll(rows);
  return updated;
}

export function periodStart(period: CompletedPeriod): Date {
  const d = new Date();
  switch (period) {
    case "week":
      d.setDate(d.getDate() - 7);
      break;
    case "month":
      d.setMonth(d.getMonth() - 1);
      break;
    case "3months":
      d.setMonth(d.getMonth() - 3);
      break;
    case "6months":
      d.setMonth(d.getMonth() - 6);
      break;
  }
  return d;
}

export function formatServiceCallDate(iso: string): string {
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

export function serviceCallTitle(record: ServiceCallRecord): string {
  const name = record.fields.customerName.trim();
  if (name) return name;
  const company = record.fields.companyName.trim();
  if (company) return company;
  return "Service call";
}

export function serviceCallSubtitle(record: ServiceCallRecord): string {
  const parts: string[] = [];
  const day = (record.scheduledDayKey ?? "").trim();
  const tm = (record.scheduledTimeLocal ?? "").trim();
  if (day && tm) {
    const iso = buildISOFromDayAndTime(day, tm);
    if (iso) {
      try {
        const when = new Date(iso).toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        parts.push(when);
      } catch {
        parts.push(`${day} ${tm}`);
      }
    }
  }
  const city = record.fields.city.trim();
  const state = record.fields.state.trim();
  if (city || state) parts.push([city, state].filter(Boolean).join(", "));
  const phone =
    record.fields.phoneMobile.trim() ||
    record.fields.phoneHome.trim() ||
    record.fields.phoneWork.trim();
  if (phone) parts.push(phone);
  if (record.fields.workOrderNotes.trim()) {
    const note = record.fields.workOrderNotes.trim();
    parts.push(note.length > 48 ? `${note.slice(0, 48)}…` : note);
  }
  const wf = record.workflowStatus;
  if (wf && wf !== "new") {
    const label =
      wf === "scheduled"
        ? "Scheduled"
        : wf === "in_progress"
          ? "In progress"
          : wf === "completed"
            ? "Completed"
            : wf === "canceled"
              ? "Canceled"
              : wf;
    parts.unshift(label);
  }
  if (record.source === "customer_link") parts.push("Customer request");
  return parts.join(" · ") || "No details yet";
}
