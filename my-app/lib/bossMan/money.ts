import { parseNumericInput } from "@/lib/myCrewSettings";

import type { BossEstimate } from "./types";

export function formatBossMoney(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function computeBossEstimateTotal(estimate: BossEstimate): number {
  const labor = parseNumericInput(estimate.laborAmount);
  const material = parseNumericInput(estimate.materialAmount);
  const permit = parseNumericInput(estimate.permitAmount);
  const misc = parseNumericInput(estimate.miscAmount);
  const lineSum = estimate.lineItems.reduce(
    (sum, line) => sum + parseNumericInput(line.amount),
    0,
  );
  const subtotal = labor + material + permit + misc + lineSum;
  const markupPct = parseNumericInput(estimate.markupPercent);
  const withMarkup = subtotal * (1 + markupPct / 100);
  const taxPct = parseNumericInput(estimate.taxPercent);
  return withMarkup * (1 + taxPct / 100);
}
