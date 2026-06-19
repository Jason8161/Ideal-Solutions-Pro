import {
  AI_ASSISTANCE_QUICK_PROMPTS,
  AI_ASSISTANCE_STARTER_PROMPTS,
  type AiAssistanceStarterPrompt,
} from "@/lib/aiAssistanceTypes";
import { AI_ASSISTANT_TOOLS, type AiAssistantToolDefinition, type AiAssistantToolId } from "@/lib/aiAssistant/types";
import { tradeLabelForEstimateTemplates } from "@/lib/bossMan/estimateQuickTemplates";
import { inferTradeCategory } from "@/lib/suppliers/tradeCategory";
import type { TradeCategory } from "@/lib/suppliers/types";

export type TradeAiContext = {
  tradeCategory: TradeCategory;
  /** Profile text when set, otherwise trade bucket label. */
  tradeLabel: string;
  hasBusinessType: boolean;
};

const SUGGESTED_TOOL_IDS_BY_TRADE: Record<TradeCategory, readonly AiAssistantToolId[]> = {
  electrical: ["troubleshooting", "material-request", "safety-question", "daily-report", "customer-message"],
  plumbing: ["troubleshooting", "material-request", "customer-message", "daily-report", "safety-question"],
  hvac: ["troubleshooting", "safety-question", "material-request", "daily-report", "customer-message"],
  siding_roofing: ["daily-report", "material-request", "customer-message", "safety-question", "troubleshooting"],
  general: ["daily-report", "material-request", "customer-message", "troubleshooting", "safety-question"],
};

const SUGGESTED_STARTER_LABELS_BY_TRADE: Record<TradeCategory, readonly string[]> = {
  electrical: [
    "Building or code question",
    "Help estimate this job",
    "Service call notes",
    "Build a material list",
    "Plan this job",
    "Customer message",
  ],
  plumbing: [
    "Service call notes",
    "Build a material list",
    "Building or code question",
    "Customer message",
    "Help estimate this job",
    "Plan this job",
  ],
  hvac: [
    "Service call notes",
    "Building or code question",
    "Plan this job",
    "Build a material list",
    "Help estimate this job",
    "Customer message",
  ],
  siding_roofing: [
    "Help estimate this job",
    "Build a material list",
    "Plan this job",
    "Customer message",
    "Building or code question",
    "Service call notes",
  ],
  general: AI_ASSISTANCE_STARTER_PROMPTS.map((p) => p.label),
};

const SUGGESTED_QUICK_PROMPTS_BY_TRADE: Record<TradeCategory, readonly string[]> = {
  electrical: [
    "Building/code question",
    "Troubleshoot a jobsite issue",
    "Help estimate this job",
    "Build me a material list",
    "Create service call notes",
    "Write customer message",
  ],
  plumbing: [
    "Create service call notes",
    "Build me a material list",
    "Building/code question",
    "Write customer message",
    "Help estimate this job",
    "Troubleshoot a jobsite issue",
  ],
  hvac: [
    "Create service call notes",
    "Building/code question",
    "Troubleshoot a jobsite issue",
    "Build me a material list",
    "Help estimate this job",
    "Write customer message",
  ],
  siding_roofing: [
    "Help estimate this job",
    "Build me a material list",
    "Create service call notes",
    "Write customer message",
    "Building/code question",
    "Troubleshoot a jobsite issue",
  ],
  general: [...AI_ASSISTANCE_QUICK_PROMPTS],
};

export type HomeGridTileKey =
  | "ai-assistance"
  | "job-folder"
  | "calendar"
  | "employee-actions"
  | "social-media"
  | "misc-apps";

const DEFAULT_HOME_GRID_KEYS: readonly HomeGridTileKey[] = [
  "ai-assistance",
  "job-folder",
  "calendar",
  "employee-actions",
  "social-media",
  "misc-apps",
];

/** Home grid keys — AI tile stays first; Job Folder follows for estimate-heavy trades. */
const HOME_GRID_PRIORITY_BY_TRADE: Record<TradeCategory, readonly HomeGridTileKey[]> = {
  electrical: ["ai-assistance", "job-folder", "calendar", "employee-actions", "social-media", "misc-apps"],
  plumbing: ["ai-assistance", "job-folder", "calendar", "employee-actions", "social-media", "misc-apps"],
  hvac: ["ai-assistance", "job-folder", "calendar", "employee-actions", "social-media", "misc-apps"],
  siding_roofing: ["ai-assistance", "job-folder", "calendar", "employee-actions", "social-media", "misc-apps"],
  general: [...DEFAULT_HOME_GRID_KEYS],
};

export function getTradeAiContext(businessType: string): TradeAiContext {
  const tradeCategory = inferTradeCategory(businessType);
  const tradeLabel = tradeLabelForEstimateTemplates(tradeCategory, businessType);
  return {
    tradeCategory,
    tradeLabel,
    hasBusinessType: businessType.trim().length > 0,
  };
}

export function suggestedForSectionTitle(tradeLabel: string): string {
  return `Suggested for ${tradeLabel}`;
}

export function tradeAiEmptyHint(): string {
  return "Set your type of business under Settings → User info to see AI prompts matched to your trade.";
}

function reorderByPriority<T>(all: readonly T[], priority: readonly T[], key: (item: T) => string): T[] {
  const byKey = new Map(all.map((item) => [key(item), item]));
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const id of priority) {
    const item = byKey.get(id);
    if (!item || seen.has(id)) continue;
    seen.add(id);
    ordered.push(item);
  }
  for (const item of all) {
    const id = key(item);
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(item);
  }
  return ordered;
}

export function partitionAiAssistantTools(businessType: string): {
  suggested: AiAssistantToolDefinition[];
  more: AiAssistantToolDefinition[];
  context: TradeAiContext;
} {
  const context = getTradeAiContext(businessType);
  const priority = SUGGESTED_TOOL_IDS_BY_TRADE[context.tradeCategory];
  const ordered = reorderByPriority(AI_ASSISTANT_TOOLS, priority, (t) => t.id);
  if (!context.hasBusinessType) {
    return { suggested: [], more: [...ordered], context };
  }
  const suggestedCount = Math.min(3, ordered.length);
  return {
    suggested: ordered.slice(0, suggestedCount),
    more: ordered.slice(suggestedCount),
    context,
  };
}

export function partitionAiAssistanceStarters(businessType: string): {
  suggested: AiAssistanceStarterPrompt[];
  more: AiAssistanceStarterPrompt[];
  context: TradeAiContext;
} {
  const context = getTradeAiContext(businessType);
  const priority = SUGGESTED_STARTER_LABELS_BY_TRADE[context.tradeCategory];
  const ordered = reorderByPriority(AI_ASSISTANCE_STARTER_PROMPTS, priority, (p) => p.label);
  if (!context.hasBusinessType) {
    return { suggested: [], more: [...ordered], context };
  }
  const suggestedCount = Math.min(4, ordered.length);
  return {
    suggested: ordered.slice(0, suggestedCount),
    more: ordered.slice(suggestedCount),
    context,
  };
}

export function getSuggestedAiAssistanceQuickPrompts(businessType: string): readonly string[] {
  const { tradeCategory, hasBusinessType } = getTradeAiContext(businessType);
  if (!hasBusinessType) return AI_ASSISTANCE_QUICK_PROMPTS;
  const priority = SUGGESTED_QUICK_PROMPTS_BY_TRADE[tradeCategory];
  return reorderByPriority(AI_ASSISTANCE_QUICK_PROMPTS, priority, (p) => p);
}

export function reorderHomeGridKeysForBusiness<K extends string>(
  businessType: string,
  defaultKeys: readonly K[],
): K[] {
  const { tradeCategory, hasBusinessType } = getTradeAiContext(businessType);
  if (!hasBusinessType) return [...defaultKeys];
  const priority = HOME_GRID_PRIORITY_BY_TRADE[tradeCategory] as readonly K[];
  return reorderByPriority([...defaultKeys], priority, (k) => k);
}
