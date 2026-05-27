import type { TradeCategory } from "@/lib/suppliers/types";

/** Map free-text business type to a trade bucket for supply-house suggestions. */
export function inferTradeCategory(businessType: string): TradeCategory {
  const t = businessType.trim().toLowerCase();
  if (!t) return "general";

  if (/\b(plumb|pipe|drain|sewer|water heater)\b/.test(t)) return "plumbing";
  if (/\b(electric|electrical|wire|low[- ]?volt|datacom|alarm)\b/.test(t)) return "electrical";
  if (/\b(hvac|heating|cooling|air condition|refrigerat|mechanical)\b/.test(t)) return "hvac";
  if (/\b(siding|roof|roofing|gutter|exterior|window install|cladding|fence|fencing)\b/.test(t)) {
    return "siding_roofing";
  }
  if (/\b(carpent|framing|drywall|remodel|deck|decking|general contractor|gc|construction|diy)\b/.test(t)) {
    return "general";
  }

  return "general";
}
