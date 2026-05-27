import { shouldApplyLengthPricing } from "@/lib/lengthBasedPricing";
import {
  lengthMatchScore,
  requestedLengthFeet,
  type LengthUnit,
  type ParsedLengthQty,
} from "@/lib/materialsLengthQtyShared";
import { extractWireGauge } from "@/lib/materialsSearchQuery";
import { labelForSupplyHousePreset, type SupplyHousePresetId } from "@/lib/supplierPresets";
import type { ProductWithPricing } from "@/services/pricing";

/** Match catalog `supplier` field to a supply-house preset (e.g. homedepot, graybar). */
export function supplierMatchesPreset(supplier: string | null | undefined, presetId: SupplyHousePresetId): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s = norm(String(supplier ?? ""));
  const id = norm(presetId);
  const label = norm(labelForSupplyHousePreset(presetId));
  if (!s) return false;
  if (s === id || s.includes(id) || id.includes(s)) return true;
  if (label.length >= 4 && (s.includes(label) || label.includes(s))) return true;
  return false;
}

export type CatalogMatchOptions = {
  length?: number;
  lengthUnit?: LengthUnit;
  /** When set, prefer rows whose title/SKU includes this gauge (e.g. 14/2). */
  wireGauge?: string | null;
};

function wireGaugeMatchScore(row: ProductWithPricing, gauge: string | null | undefined): number {
  if (!gauge) return 0;
  const hay = `${row.name} ${row.description ?? ""} ${row.sku ?? ""}`.toLowerCase();
  const variants = [gauge, gauge.replace(/\//g, "-"), gauge.replace(/-/g, "/")];
  return variants.some((v) => hay.includes(v)) ? 40 : -50;
}

function compareCatalogRows(
  a: ProductWithPricing,
  b: ProductWithPricing,
  targetFeet: number | null,
  wireGauge: string | null | undefined,
): number {
  if (wireGauge) {
    const gaugeDiff = wireGaugeMatchScore(b, wireGauge) - wireGaugeMatchScore(a, wireGauge);
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
  return String(a.name ?? "").localeCompare(String(b.name ?? ""));
}

/** Best catalog row for this vendor (length-aware when requested, else lowest price). */
export function bestCatalogMatch(
  results: ProductWithPricing[],
  presetId: SupplyHousePresetId,
  options?: CatalogMatchOptions | ParsedLengthQty,
): ProductWithPricing | null {
  const lengthOpts: CatalogMatchOptions =
    options && "qty" in options
      ? {
          length: options.length,
          lengthUnit: options.lengthUnit,
          wireGauge: "wireGauge" in options ? (options as CatalogMatchOptions).wireGauge : undefined,
        }
      : (options ?? {});
  const matches = results.filter((r) => supplierMatchesPreset(r.supplier, presetId));
  if (matches.length === 0) return null;

  const targetFeet =
    lengthOpts.length !== undefined && lengthOpts.length > 0
      ? requestedLengthFeet(lengthOpts.length, lengthOpts.lengthUnit ?? "ft")
      : null;
  const wireGauge = lengthOpts.wireGauge ?? null;

  return [...matches].sort((a, b) => compareCatalogRows(a, b, targetFeet, wireGauge))[0];
}

export type CatalogPriceKind = "live" | "estimate" | "none";

/** Prefer a live-priced row when present; otherwise best catalog estimate for this vendor. */
export function bestCatalogMatchPreferLive(
  results: ProductWithPricing[],
  presetId: SupplyHousePresetId,
  options?: CatalogMatchOptions | ParsedLengthQty,
): { match: ProductWithPricing | null; kind: CatalogPriceKind } {
  const lengthOpts: CatalogMatchOptions =
    options && "qty" in options
      ? {
          length: options.length,
          lengthUnit: options.lengthUnit,
          wireGauge: "wireGauge" in options ? (options as CatalogMatchOptions).wireGauge : undefined,
        }
      : (options ?? {});

  const forPreset = results.filter((r) => supplierMatchesPreset(r.supplier, presetId));
  const liveRows = forPreset.filter((r) => r.pricingSource === "live");
  const estRows = forPreset.filter((r) => r.pricingSource !== "live");

  const pick = (pool: ProductWithPricing[]): ProductWithPricing | null => {
    if (pool.length === 0) return null;
    const targetFeet =
      lengthOpts.length !== undefined && lengthOpts.length > 0
        ? requestedLengthFeet(lengthOpts.length, lengthOpts.lengthUnit ?? "ft")
        : null;
    const wireGauge = lengthOpts.wireGauge ?? null;
    return [...pool].sort((a, b) => compareCatalogRows(a, b, targetFeet, wireGauge))[0];
  };

  const liveMatch = pick(liveRows);
  if (liveMatch) return { match: liveMatch, kind: "live" };
  const estMatch = pick(estRows);
  if (estMatch) return { match: estMatch, kind: "estimate" };
  return { match: null, kind: "none" };
}
