import type { ProductWithPricing } from "@/services/pricing";

/** Format a catalog/API price for display (adds $ when missing). */
export function formatVendorPrice(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const t = String(amount).trim();
  if (!t) return "—";
  if (t.startsWith("$")) return t;
  return `$${t}`;
}

export type LengthUnit = "ft" | "m";

export type ParsedLengthQty = {
  length?: number;
  lengthUnit: LengthUnit;
  qty: number;
};

export const FT_PER_M = 3.280839895;

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
