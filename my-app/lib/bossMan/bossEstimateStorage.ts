import AsyncStorage from "@react-native-async-storage/async-storage";

import { computeBossEstimateTotal } from "./money";
import { addBossJob } from "./jobStorage";
import type { BossEstimate, BossEstimateLineItem, EstimateTemplateType } from "./types";

export const BOSS_ESTIMATES_STORAGE_KEY = "ideal_solutions_boss_estimates_v1";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function newBossEstimateLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyBossEstimate(templateType: EstimateTemplateType = "custom"): BossEstimate {
  const now = new Date().toISOString();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    templateType,
    customerName: "",
    jobName: defaultJobNameForTemplate(templateType),
    address: "",
    laborAmount: "",
    materialAmount: "",
    permitAmount: "",
    miscAmount: "",
    taxPercent: "",
    markupPercent: "",
    notes: "",
    scope: defaultScopeForTemplate(templateType),
    terms: "Payment due upon completion unless otherwise agreed in writing.",
    signatureApproved: false,
    lineItems: [],
  };
}

function defaultJobNameForTemplate(template: EstimateTemplateType): string {
  switch (template) {
    case "deck-build":
      return "Deck build";
    case "bathroom-remodel":
      return "Bathroom remodel";
    case "fence-install":
      return "Fence install";
    case "new-house-rough-in":
      return "New house rough-in";
    case "panel-change":
      return "Panel change";
    case "service-call":
      return "Service call";
    case "generator-install":
      return "Generator install";
    default:
      return "";
  }
}

function defaultScopeForTemplate(template: EstimateTemplateType): string {
  switch (template) {
    case "deck-build":
      return "Layout, footings or posts, framing, decking, railings per plan, and jobsite cleanup.";
    case "bathroom-remodel":
      return "Demo as scoped, rough plumbing/electrical coordination, finishes, fixtures, and punch-list walkthrough.";
    case "fence-install":
      return "Layout, posts, panels or pickets, gates as specified, and final grade/cleanup.";
    case "new-house-rough-in":
      return "Rough-in electrical per plans: device boxes, branch circuits, panel feed, and trim-ready prep.";
    case "panel-change":
      return "Remove existing panel, install new panel, transfer circuits, labeling, and inspection-ready finish.";
    case "service-call":
      return "Troubleshoot reported issue, repair as needed, test, and leave work area clean.";
    case "generator-install":
      return "Generator interlock or transfer switch, bonding, startup, and customer walkthrough.";
    default:
      return "";
  }
}

async function loadAll(): Promise<BossEstimate[]> {
  try {
    const raw = await AsyncStorage.getItem(BOSS_ESTIMATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as BossEstimate[];
  } catch {
    return [];
  }
}

async function saveAll(rows: BossEstimate[]): Promise<void> {
  await AsyncStorage.setItem(BOSS_ESTIMATES_STORAGE_KEY, JSON.stringify(rows));
}

export async function loadBossEstimates(): Promise<BossEstimate[]> {
  const rows = await loadAll();
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getBossEstimateById(id: string): Promise<BossEstimate | null> {
  const rows = await loadAll();
  return rows.find((e) => e.id === id) ?? null;
}

export async function saveBossEstimate(estimate: BossEstimate): Promise<BossEstimate> {
  const rows = await loadAll();
  const normalized: BossEstimate = {
    ...estimate,
    updatedAt: new Date().toISOString(),
    lineItems: estimate.lineItems.map((line) => ({
      ...line,
      id: line.id || newBossEstimateLineId(),
    })),
  };
  const idx = rows.findIndex((e) => e.id === normalized.id);
  if (idx >= 0) {
    rows[idx] = normalized;
  } else {
    rows.push(normalized);
  }
  await saveAll(rows);
  return normalized;
}

export async function deleteBossEstimate(id: string): Promise<void> {
  const rows = await loadAll();
  await saveAll(rows.filter((e) => e.id !== id));
}

export function bossEstimateTitle(estimate: BossEstimate): string {
  const customer = estimate.customerName.trim();
  const job = estimate.jobName.trim();
  if (customer && job) return `${customer} — ${job}`;
  return customer || job || "Estimate";
}

export function bossEstimateSubtitle(estimate: BossEstimate): string {
  return formatBossEstimateTotal(estimate);
}

function formatBossEstimateTotal(estimate: BossEstimate): string {
  const total = computeBossEstimateTotal(estimate);
  return total.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function convertBossEstimateToJob(estimateId: string): Promise<import("./types").BossJob | null> {
  const estimate = await getBossEstimateById(estimateId);
  if (!estimate) return null;
  const total = computeBossEstimateTotal(estimate);
  return addBossJob({
    customerName: estimate.customerName,
    jobName: estimate.jobName,
    address: estimate.address,
    status: "New",
    estimateTotal: total,
    estimateId: estimate.id,
  });
}

export function newBossEstimateLine(): BossEstimateLineItem {
  return { id: newBossEstimateLineId(), description: "", amount: "" };
}
