import { inferTradeCategory } from "@/lib/suppliers/tradeCategory";
import type { TradeCategory } from "@/lib/suppliers/types";
import type { EstimateTemplateType } from "@/lib/bossMan/types";

const ALL_JOB_TEMPLATES: readonly EstimateTemplateType[] = [
  "deck-build",
  "bathroom-remodel",
  "fence-install",
  "service-call",
  "panel-change",
  "new-house-rough-in",
  "generator-install",
] as const;

/** Quick templates shown first for each trade (custom is always appended). */
const PRIMARY_BY_TRADE: Record<TradeCategory, readonly EstimateTemplateType[]> = {
  electrical: ["panel-change", "new-house-rough-in", "generator-install", "service-call"],
  plumbing: ["bathroom-remodel", "service-call"],
  hvac: ["service-call", "generator-install"],
  siding_roofing: ["fence-install", "deck-build", "service-call"],
  general: [
    "service-call",
    "deck-build",
    "bathroom-remodel",
    "fence-install",
    "panel-change",
    "new-house-rough-in",
    "generator-install",
  ],
};

const TRADE_CATEGORY_LABELS: Record<TradeCategory, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "HVAC",
  siding_roofing: "Siding & roofing",
  general: "General contracting",
};

export type QuickEstimateTemplateGroups = {
  tradeCategory: TradeCategory;
  /** User-facing label (profile text when set, otherwise trade bucket). */
  tradeLabel: string;
  /** Templates for this trade, plus Custom at the end. */
  primary: EstimateTemplateType[];
  /** Other job templates not in the primary list (hidden when empty). */
  more: EstimateTemplateType[];
  hasBusinessType: boolean;
};

function boostTemplatesForBusinessType(
  templates: EstimateTemplateType[],
  businessType: string,
): EstimateTemplateType[] {
  const t = businessType.trim().toLowerCase();
  if (!t) return [...templates];

  const boosts: EstimateTemplateType[] = [];
  if (/\b(deck|decking)\b/.test(t)) boosts.push("deck-build");
  if (/\b(fence|fencing)\b/.test(t)) boosts.push("fence-install");
  if (/\b(bath|remodel|renovat)\b/.test(t)) boosts.push("bathroom-remodel");
  if (/\b(panel|service upgrade|meter)\b/.test(t)) boosts.push("panel-change");
  if (/\b(rough[- ]?in|new build|new home)\b/.test(t)) boosts.push("new-house-rough-in");
  if (/\b(generator|standby power|transfer switch)\b/.test(t)) boosts.push("generator-install");
  if (/\b(service call|troubleshoot|repair visit)\b/.test(t)) boosts.push("service-call");

  const seen = new Set<EstimateTemplateType>();
  const ordered: EstimateTemplateType[] = [];
  for (const id of [...boosts, ...templates]) {
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

export function tradeLabelForEstimateTemplates(
  tradeCategory: TradeCategory,
  businessType: string,
): string {
  const trimmed = businessType.trim();
  if (trimmed) return trimmed;
  return TRADE_CATEGORY_LABELS[tradeCategory];
}

export function getQuickEstimateTemplatesForBusiness(businessType: string): QuickEstimateTemplateGroups {
  const tradeCategory = inferTradeCategory(businessType);
  const tradeLabel = tradeLabelForEstimateTemplates(tradeCategory, businessType);
  const basePrimary = [...PRIMARY_BY_TRADE[tradeCategory]];
  const boosted = boostTemplatesForBusinessType(basePrimary, businessType);
  const primarySet = new Set(boosted);
  const more = ALL_JOB_TEMPLATES.filter((t) => !primarySet.has(t));

  return {
    tradeCategory,
    tradeLabel,
    primary: [...boosted, "custom"],
    more,
    hasBusinessType: businessType.trim().length > 0,
  };
}

export function quickTemplatesSubtitle(groups: QuickEstimateTemplateGroups): string {
  if (!groups.hasBusinessType) {
    return "Set your type of business under Settings → User info to see templates matched to your trade.";
  }
  if (groups.more.length === 0) {
    return `Templates for ${groups.tradeLabel} — tap one to start a quote with scope text filled in.`;
  }
  return `Templates for ${groups.tradeLabel} first. Other job types are listed below.`;
}
