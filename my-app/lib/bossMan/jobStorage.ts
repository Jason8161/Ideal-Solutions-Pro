import AsyncStorage from "@react-native-async-storage/async-storage";

import { createPaymentDraw, normalizePaymentDraws } from "./paymentDraws";
import type { BossJob, JobNote, JobStatus, PersonalTabStatesMap } from "./types";

export const BOSS_JOBS_STORAGE_KEY = "ideal_solutions_boss_jobs_v1";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function loadAll(): Promise<BossJob[]> {
  try {
    const raw = await AsyncStorage.getItem(BOSS_JOBS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as BossJob[];
  } catch {
    return [];
  }
}

async function saveAll(jobs: BossJob[]): Promise<void> {
  await AsyncStorage.setItem(BOSS_JOBS_STORAGE_KEY, JSON.stringify(jobs));
}

export function isBossJobActive(job: BossJob): boolean {
  return job.status !== "Completed" && !job.completedAt;
}

export function isBossJobCompleted(job: BossJob): boolean {
  return job.status === "Completed" || Boolean(job.completedAt);
}

export async function loadBossJobs(): Promise<BossJob[]> {
  const rows = await loadAll();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadActiveBossJobs(): Promise<BossJob[]> {
  return (await loadBossJobs()).filter(isBossJobActive);
}

export async function loadCompletedBossJobs(): Promise<BossJob[]> {
  return (await loadBossJobs()).filter(isBossJobCompleted);
}

export async function getBossJobById(id: string): Promise<BossJob | null> {
  const rows = await loadAll();
  return rows.find((j) => j.id === id) ?? null;
}

export type CreateBossJobInput = {
  customerName: string;
  jobName: string;
  address: string;
  status?: JobStatus;
  jobPhase?: string;
  personalTabNames?: string[];
  personalTabStates?: PersonalTabStatesMap;
  estimateTotal?: number;
  paid?: boolean;
  materialListId?: string;
  serviceCallIds?: string[];
  estimateId?: string;
};

export async function addBossJob(input: CreateBossJobInput): Promise<BossJob> {
  const job: BossJob = {
    id: newId(),
    customerName: input.customerName.trim(),
    jobName: input.jobName.trim(),
    address: input.address.trim(),
    status: input.status ?? "New",
    jobPhase: input.jobPhase?.trim() || undefined,
    personalTabNames:
      input.personalTabNames && input.personalTabNames.length > 0
        ? input.personalTabNames
        : undefined,
    personalTabStates: input.personalTabStates,
    estimateTotal: input.estimateTotal ?? 0,
    paid: input.paid ?? false,
    notes: [],
    photoUris: [],
    materialListId: input.materialListId,
    serviceCallIds: input.serviceCallIds ?? [],
    estimateId: input.estimateId,
    createdAt: new Date().toISOString(),
  };
  const rows = await loadAll();
  rows.push(job);
  await saveAll(rows);
  return job;
}

export async function updateBossJob(id: string, patch: Partial<BossJob>): Promise<BossJob | null> {
  const rows = await loadAll();
  const idx = rows.findIndex((j) => j.id === id);
  if (idx < 0) return null;
  const updated: BossJob = { ...rows[idx], ...patch, id: rows[idx].id };
  rows[idx] = updated;
  await saveAll(rows);
  return updated;
}

export async function addBossJobNote(id: string, text: string): Promise<BossJob | null> {
  const trimmed = text.trim();
  if (!trimmed) return getBossJobById(id);
  const note: JobNote = {
    id: newId(),
    text: trimmed,
    createdAt: new Date().toISOString(),
  };
  const job = await getBossJobById(id);
  if (!job) return null;
  return updateBossJob(id, { notes: [...job.notes, note] });
}

export async function addBossJobPhoto(id: string, uri: string): Promise<BossJob | null> {
  const job = await getBossJobById(id);
  if (!job || !uri.trim()) return job;
  return updateBossJob(id, { photoUris: [...job.photoUris, uri.trim()] });
}

export async function removeBossJobPhoto(id: string, uri: string): Promise<BossJob | null> {
  const job = await getBossJobById(id);
  if (!job) return null;
  const trimmed = uri.trim();
  if (!trimmed) return job;
  const next = job.photoUris.filter((u) => u !== trimmed);
  if (next.length === job.photoUris.length) return job;
  return updateBossJob(id, { photoUris: next });
}

export async function markBossJobComplete(id: string): Promise<BossJob | null> {
  return updateBossJob(id, {
    status: "Completed",
    completedAt: new Date().toISOString(),
    finalInvoiceStub: undefined,
  });
}

export async function reopenBossJob(id: string): Promise<BossJob | null> {
  return updateBossJob(id, {
    status: "In Progress",
    completedAt: undefined,
  });
}

export async function duplicateBossJob(id: string): Promise<BossJob | null> {
  const source = await getBossJobById(id);
  if (!source) return null;
  const copy = await addBossJob({
    customerName: source.customerName,
    jobName: `${source.jobName} (copy)`.trim(),
    address: source.address,
    status: "New",
    jobPhase: source.jobPhase,
    personalTabNames: source.personalTabNames ? [...source.personalTabNames] : undefined,
    personalTabStates: source.personalTabStates
      ? { ...source.personalTabStates }
      : undefined,
    estimateTotal: source.estimateTotal,
    paid: false,
    materialListId: source.materialListId,
    serviceCallIds: [...source.serviceCallIds],
    estimateId: source.estimateId,
  });
  if (!copy || !source.paymentDraws?.length) return copy;
  const draws = normalizePaymentDraws(source.paymentDraws).map((d) =>
    createPaymentDraw(d.label, { amount: d.amount, percent: d.percent, dueDate: d.dueDate }),
  );
  return updateBossJob(copy.id, { paymentDraws: draws });
}

export function formatBossJobDate(iso: string): string {
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
