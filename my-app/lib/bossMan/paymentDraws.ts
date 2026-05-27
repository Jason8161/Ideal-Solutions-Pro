import { getBossJobById, updateBossJob } from "./jobStorage";
import type { BossJob, PaymentDraw, PaymentDrawStatus } from "./types";

export type { PaymentDraw, PaymentDrawStatus } from "./types";

export const PAYMENT_DRAW_PRESETS = ["Rough In", "Trim Out", "Final"] as const;

export type PaymentDrawPreset = (typeof PAYMENT_DRAW_PRESETS)[number];

export const PAYMENT_DRAW_STATUS_LABELS: Record<PaymentDrawStatus, string> = {
  pending: "Pending",
  requested: "Requested",
  paid: "Paid",
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function normalizePaymentDraw(row: PaymentDraw): PaymentDraw {
  const status =
    row.status === "requested" || row.status === "paid" ? row.status : "pending";
  return {
    id: row.id || newId(),
    label: row.label?.trim() || "Draw",
    amount: typeof row.amount === "number" && row.amount >= 0 ? row.amount : undefined,
    percent:
      typeof row.percent === "number" && row.percent >= 0 && row.percent <= 100
        ? row.percent
        : undefined,
    status,
    dueDate: row.dueDate?.trim() || undefined,
    invoiceId: row.invoiceId?.trim() || undefined,
  };
}

export function normalizePaymentDraws(raw: unknown): PaymentDraw[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => normalizePaymentDraw(row as PaymentDraw));
}

export function getJobPaymentDraws(job: BossJob): PaymentDraw[] {
  return normalizePaymentDraws(job.paymentDraws);
}

export function createPaymentDraw(
  label: string,
  partial?: Partial<Omit<PaymentDraw, "id" | "label" | "status">>,
): PaymentDraw {
  return normalizePaymentDraw({
    id: newId(),
    label: label.trim() || "Draw",
    status: "pending",
    ...partial,
  });
}

export function drawLabelKey(label: string): string {
  return label.trim().toLowerCase();
}

export function jobHasDrawLabel(draws: PaymentDraw[], label: string): boolean {
  const key = drawLabelKey(label);
  return draws.some((d) => drawLabelKey(d.label) === key);
}

export function resolveDrawAmount(draw: PaymentDraw, jobEstimateTotal: number): number {
  if (typeof draw.amount === "number" && draw.amount > 0) return draw.amount;
  if (typeof draw.percent === "number" && draw.percent > 0 && jobEstimateTotal > 0) {
    return (jobEstimateTotal * draw.percent) / 100;
  }
  return 0;
}

export function formatDrawAmountSummary(
  draw: PaymentDraw,
  jobEstimateTotal: number,
): string {
  if (typeof draw.amount === "number" && draw.amount > 0) {
    return draw.amount.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  }
  if (typeof draw.percent === "number" && draw.percent > 0) {
    const resolved = resolveDrawAmount(draw, jobEstimateTotal);
    const pct = `${draw.percent}%`;
    if (resolved > 0 && jobEstimateTotal > 0) {
      return `${pct} (${resolved.toLocaleString(undefined, { style: "currency", currency: "USD" })})`;
    }
    return pct;
  }
  return "Amount TBD";
}

export function upsertPaymentDraw(draws: PaymentDraw[], draw: PaymentDraw): PaymentDraw[] {
  const normalized = normalizePaymentDraw(draw);
  const idx = draws.findIndex((d) => d.id === normalized.id);
  if (idx < 0) return [...draws, normalized];
  const next = [...draws];
  next[idx] = normalized;
  return next;
}

export function removePaymentDraw(draws: PaymentDraw[], drawId: string): PaymentDraw[] {
  return draws.filter((d) => d.id !== drawId);
}

export function setPaymentDrawStatus(
  draws: PaymentDraw[],
  drawId: string,
  status: PaymentDrawStatus,
): PaymentDraw[] {
  return draws.map((d) => (d.id === drawId ? { ...d, status } : d));
}

export function linkPaymentDrawInvoice(
  draws: PaymentDraw[],
  drawId: string,
  invoiceId: string,
): PaymentDraw[] {
  return draws.map((d) =>
    d.id === drawId
      ? { ...d, invoiceId, status: d.status === "paid" ? "paid" : "requested" }
      : d,
  );
}

export async function saveJobPaymentDraws(
  jobId: string,
  draws: PaymentDraw[],
): Promise<BossJob | null> {
  const normalized = draws.map(normalizePaymentDraw);
  return updateBossJob(jobId, {
    paymentDraws: normalized.length > 0 ? normalized : undefined,
  });
}

export async function addPaymentDrawToJob(
  jobId: string,
  draw: PaymentDraw,
): Promise<BossJob | null> {
  const job = await getBossJobById(jobId);
  if (!job) return null;
  const draws = getJobPaymentDraws(job);
  if (jobHasDrawLabel(draws, draw.label)) return job;
  return saveJobPaymentDraws(jobId, [...draws, normalizePaymentDraw(draw)]);
}

export async function updatePaymentDrawOnJob(
  jobId: string,
  drawId: string,
  patch: Partial<PaymentDraw>,
): Promise<BossJob | null> {
  const job = await getBossJobById(jobId);
  if (!job) return null;
  const draws = getJobPaymentDraws(job).map((d) =>
    d.id === drawId ? normalizePaymentDraw({ ...d, ...patch, id: d.id }) : d,
  );
  return saveJobPaymentDraws(jobId, draws);
}

export async function removePaymentDrawFromJob(
  jobId: string,
  drawId: string,
): Promise<BossJob | null> {
  const job = await getBossJobById(jobId);
  if (!job) return null;
  return saveJobPaymentDraws(jobId, removePaymentDraw(getJobPaymentDraws(job), drawId));
}

export async function attachInvoiceToPaymentDraw(
  jobId: string,
  drawId: string,
  invoiceId: string,
): Promise<BossJob | null> {
  const job = await getBossJobById(jobId);
  if (!job) return null;
  return saveJobPaymentDraws(
    jobId,
    linkPaymentDrawInvoice(getJobPaymentDraws(job), drawId, invoiceId),
  );
}

export function sumDrawAmounts(draws: PaymentDraw[], jobEstimateTotal: number): number {
  return draws.reduce((sum, d) => sum + resolveDrawAmount(d, jobEstimateTotal), 0);
}
