import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PersonalTabStatesMap } from "./types";

export const CUSTOM_JOB_PHASES_STORAGE_KEY = "ideal_solutions_custom_job_phases_v1";

function normalizePhaseName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function parsePhases(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of raw) {
    if (typeof row !== "string") continue;
    const normalized = normalizePhaseName(row);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

export async function loadCustomJobPhases(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_JOB_PHASES_STORAGE_KEY);
    if (!raw) return [];
    return parsePhases(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

async function saveCustomJobPhases(phases: string[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_JOB_PHASES_STORAGE_KEY, JSON.stringify(phases));
}

export async function addCustomJobPhase(name: string): Promise<string[]> {
  const normalized = normalizePhaseName(name);
  if (!normalized) return loadCustomJobPhases();
  const phases = await loadCustomJobPhases();
  const exists = phases.some((p) => p.toLowerCase() === normalized.toLowerCase());
  if (exists) return phases;
  const next = [...phases, normalized];
  await saveCustomJobPhases(next);
  return next;
}

export async function removeCustomJobPhase(name: string): Promise<string[]> {
  const normalized = normalizePhaseName(name);
  if (!normalized) return loadCustomJobPhases();
  const phases = await loadCustomJobPhases();
  const next = phases.filter((p) => p.toLowerCase() !== normalized.toLowerCase());
  if (next.length === phases.length) return phases;
  await saveCustomJobPhases(next);
  return next;
}

/** Merge global tab names with per-job names and state keys (no max count). */
export function mergePersonalTabPhaseNames(
  globalPhases: string[],
  jobPhases?: string[],
  phaseStates?: PersonalTabStatesMap,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    const normalized = normalizePhaseName(raw);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  };
  for (const p of jobPhases ?? []) add(p);
  for (const p of globalPhases) add(p);
  if (phaseStates) {
    for (const key of Object.keys(phaseStates)) {
      const fromJob = jobPhases?.find((p) => p.toLowerCase() === key);
      const fromGlobal = globalPhases.find((p) => p.toLowerCase() === key);
      add(fromJob ?? fromGlobal ?? key);
    }
  }
  return out;
}
