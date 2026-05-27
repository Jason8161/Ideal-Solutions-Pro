import { newBossEstimateLineId } from "@/lib/bossMan/bossEstimateStorage";
import type { BossEstimate } from "@/lib/bossMan/types";
import type { PhotoEstimateAiResult } from "@/lib/photoToEstimateTypes";

function amountString(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return String(Math.round(value * 100) / 100);
}

function percentString(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return String(Math.round(value * 10) / 10);
}

function mergeNotes(existing: string, result: PhotoEstimateAiResult): string {
  const parts: string[] = [];
  if (existing.trim()) parts.push(existing.trim());
  if (result.notes.trim()) parts.push(result.notes.trim());
  if (result.assumptions.length > 0) {
    parts.push(`AI assumptions:\n${result.assumptions.map((a) => `• ${a}`).join("\n")}`);
  }
  parts.push(`Photo estimate confidence: ${result.confidence}`);
  return parts.join("\n\n");
}

/** Merge AI photo estimate into a Boss Man quick estimate draft. */
export function applyPhotoEstimateToBossEstimate(
  base: BossEstimate,
  result: PhotoEstimateAiResult,
): BossEstimate {
  return {
    ...base,
    jobName: result.jobName.trim() || base.jobName,
    customerName: result.customerName.trim() || base.customerName,
    scope: result.scope.trim() || base.scope,
    laborAmount: amountString(result.laborAmount) || base.laborAmount,
    materialAmount: amountString(result.materialAmount) || base.materialAmount,
    permitAmount: amountString(result.permitAmount) || base.permitAmount,
    miscAmount: amountString(result.miscAmount) || base.miscAmount,
    markupPercent: percentString(result.markupPercent) || base.markupPercent,
    taxPercent: percentString(result.taxPercent) || base.taxPercent,
    lineItems:
      result.lineItems.length > 0
        ? result.lineItems.map((line) => ({
            id: newBossEstimateLineId(),
            description: line.description,
            amount: amountString(line.amount),
          }))
        : base.lineItems,
    notes: mergeNotes(base.notes, result),
  };
}
