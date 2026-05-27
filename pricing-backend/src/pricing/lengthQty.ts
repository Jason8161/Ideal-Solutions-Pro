import { expandTokenVariants } from "./catalogSearchText";
import { shouldApplyLengthPricing } from "./lengthBasedPricing";
import type { ProductWithPricing } from "./contracts";

export type LengthUnit = "ft" | "m";

export type SearchLengthQtyOptions = {
  length?: number;
  lengthUnit?: LengthUnit;
  qty: number;
};

const FT_PER_M = 3.280839895;

/** Parse optional `length`, `unit` (ft|m), and `qty` from HTTP query strings. */
export function parseSearchLengthQtyParams(query: Record<string, unknown>): SearchLengthQtyOptions {
  const qty = parsePositiveInt(query.qty, 1);
  const lengthRaw = typeof query.length === "string" ? query.length.trim() : "";
  if (!lengthRaw) {
    return { qty };
  }
  const length = Number.parseFloat(lengthRaw);
  if (!Number.isFinite(length) || length <= 0) {
    return { qty };
  }
  const unitRaw = typeof query.unit === "string" ? query.unit.trim().toLowerCase() : "ft";
  const lengthUnit: LengthUnit = unitRaw === "m" || unitRaw === "meter" || unitRaw === "meters" ? "m" : "ft";
  return { length, lengthUnit, qty };
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 9_999);
}

/**
 * Optional `vendors=homedepot,lowes,...` on catalog search — limits which live retailer
 * APIs the server calls (catalog DB/CSV always run). Omitted = all configured live sources.
 */
export function parseVendorPresetFilter(query: Record<string, unknown>): string[] | null {
  const raw = query.vendors;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return [...new Set(parts)];
}

/** Extract pack length from product text (returns feet for comparison). */
export function parsePackLengthFeet(text: string): number | null {
  const t = text.toLowerCase();
  const ftMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|')\b/);
  if (ftMatch) {
    const n = Number.parseFloat(ftMatch[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const mMatch = t.match(/(\d+(?:\.\d+)?)\s*m(?:eter|etre|eters|etres)?\b/);
  if (mMatch) {
    const n = Number.parseFloat(mMatch[1]);
    return Number.isFinite(n) && n > 0 ? n * FT_PER_M : null;
  }
  return null;
}

export function productPackLengthFeet(row: ProductWithPricing): number | null {
  for (const field of [row.unit, row.unitOfMeasure, row.name, row.description]) {
    if (!field) continue;
    const parsed = parsePackLengthFeet(String(field));
    if (parsed !== null) return parsed;
  }
  return null;
}

export function requestedLengthFeet(length: number, unit: LengthUnit): number {
  return unit === "m" ? length * FT_PER_M : length;
}

/** Higher score = better length match for the requested pack size. */
export function lengthMatchScore(row: ProductWithPricing, targetFeet: number): number {
  const packFeet = productPackLengthFeet(row);
  if (packFeet === null) return 0;
  const ratio = packFeet / targetFeet;
  if (Math.abs(ratio - 1) < 0.02) return 100;
  if (ratio >= 0.9 && ratio <= 1.1) return 85;
  if (ratio < 0.5 || ratio > 2) return -30;
  if (ratio > 1 && ratio <= 1.25) return 40;
  if (ratio < 1 && ratio >= 0.75) return 35;
  if (ratio > 1 && ratio <= 2) return 20;
  if (ratio < 1 && ratio >= 0.5) return 15;
  return 0;
}

function productHaystack(row: ProductWithPricing): string {
  return `${row.name} ${row.description ?? ""} ${row.sku ?? ""} ${row.unit ?? ""}`.toLowerCase();
}

/** Boost rows that include the requested wire gauge (14/2 vs 12/2). */
export function wireGaugeMatchScore(row: ProductWithPricing, gauge: string | null | undefined): number {
  if (!gauge) return 0;
  const hay = productHaystack(row);
  return expandTokenVariants(gauge).some((v) => hay.includes(v)) ? 40 : -50;
}

export function rankSearchResultsByLength(
  results: ProductWithPricing[],
  options: SearchLengthQtyOptions & { wireGauge?: string | null },
): ProductWithPricing[] {
  const gauge = options.wireGauge ?? null;
  const hasLength = options.length !== undefined && options.length > 0;
  if (!hasLength && !gauge) return results;

  const unit = options.lengthUnit ?? "ft";
  const targetFeet =
    hasLength && options.length !== undefined ? requestedLengthFeet(options.length, unit) : null;

  return [...results].sort((a, b) => {
    if (gauge) {
      const gaugeDiff = wireGaugeMatchScore(b, gauge) - wireGaugeMatchScore(a, gauge);
      if (gaugeDiff !== 0) return gaugeDiff;
    }
    if (targetFeet !== null) {
      const scoreA = shouldApplyLengthPricing(a) ? lengthMatchScore(a, targetFeet) : 0;
      const scoreB = shouldApplyLengthPricing(b) ? lengthMatchScore(b, targetFeet) : 0;
      const scoreDiff = scoreB - scoreA;
      if (scoreDiff !== 0) return scoreDiff;
    }
    const pa = Number.parseFloat(String(a.price));
    const pb = Number.parseFloat(String(b.price));
    if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb;
    return a.name.localeCompare(b.name);
  });
}
