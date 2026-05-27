import {
  newEstimateLineId,
  type EstimateLineItem,
  type EstimatePricingMode,
} from "@/lib/estimateStorage";
import {
  CREW_ROLE_LABELS,
  rateForCrewRoleInTable,
  type CrewRoleKey,
  type LaborRateTable,
  type MyCrewSettings,
} from "@/lib/myCrewSettings";

export const ESTIMATE_PRICING_MODES: { mode: EstimatePricingMode; label: string }[] = [
  { mode: "project_labor", label: "Project labor rates" },
  { mode: "service_call_labor", label: "Service call labor rates" },
  { mode: "emergency_labor", label: "Emergency call labor rates" },
  { mode: "lump_sum", label: "Lump sum" },
];

export function laborRateTableForPricingMode(mode: EstimatePricingMode): LaborRateTable | null {
  switch (mode) {
    case "project_labor":
      return "project";
    case "service_call_labor":
      return "service_call";
    case "emergency_labor":
      return "emergency";
    default:
      return null;
  }
}

export function defaultPricingModeForNewEstimate(serviceCallId?: string): EstimatePricingMode {
  return serviceCallId?.trim() ? "service_call_labor" : "project_labor";
}

export function applyLaborRatesFromTable(
  lineItems: EstimateLineItem[],
  settings: MyCrewSettings,
  table: LaborRateTable,
): EstimateLineItem[] {
  return lineItems.map((line) => {
    if (line.kind !== "labor") return line;
    const role = crewRoleFromLaborDescription(line.description);
    return { ...line, rate: rateForCrewRoleInTable(settings, role, table) };
  });
}

/** Match role label embedded by lineItemsFromJobCost ("Lead man labor", etc.). */
function crewRoleFromLaborDescription(description: string): CrewRoleKey {
  const d = description.trim().toLowerCase();
  if (d.startsWith("lead man")) return "lead-man";
  if (d.startsWith("tech")) return "tech";
  if (d.startsWith("journeyman")) return "journeyman";
  if (d.startsWith("helper")) return "helper";
  return "default";
}

export function newLaborLineWithTable(
  settings: MyCrewSettings,
  table: LaborRateTable,
  role: CrewRoleKey = "default",
): EstimateLineItem {
  return {
    id: newEstimateLineId(),
    kind: "labor",
    description: role === "default" ? "Labor" : `${CREW_ROLE_LABELS[role]} labor`,
    quantity: "",
    rate: rateForCrewRoleInTable(settings, role, table),
  };
}

export function buildLumpSumLineItems(amount: string): EstimateLineItem[] {
  return [
    {
      id: newEstimateLineId(),
      kind: "other",
      description: "Lump sum",
      quantity: "1",
      rate: amount,
    },
  ];
}

export function lumpSumAmountFromLineItems(lineItems: EstimateLineItem[]): string {
  const lump = lineItems.find(
    (l) => l.kind === "other" && l.description.trim().toLowerCase().startsWith("lump sum"),
  );
  if (lump) return lump.rate;
  if (lineItems.length === 1 && lineItems[0].kind === "other") return lineItems[0].rate;
  return "";
}

export function syncLumpSumLineItems(amount: string, existing: EstimateLineItem[]): EstimateLineItem[] {
  const lumpId = existing.find(
    (l) => l.kind === "other" && l.description.trim().toLowerCase().startsWith("lump sum"),
  )?.id;
  const line: EstimateLineItem = {
    id: lumpId ?? newEstimateLineId(),
    kind: "other",
    description: "Lump sum",
    quantity: "1",
    rate: amount,
  };
  return [line];
}
