import { computeLengthPricingAdjustment } from "@/lib/lengthBasedPricing";
import {
  formatEffectivePrice,
  parseLengthInput,
  parseQtyInput,
  parseUnitPrice,
  type ParsedLengthQty,
} from "@/lib/materialsLengthQty";
import { loadVendorPresetsForMaterialPricing } from "@/lib/materialsPricingVendors";
import { bestCatalogMatch } from "@/lib/materialsVendorMatch";
import { labelForSupplyHousePreset, type SupplyHousePresetId } from "@/lib/supplierPresets";
import type { ProductWithPricing } from "@/services/pricing";
import type { PricingSearchOutcome } from "@/services/pricing/searchCatalog";
import { summarizeCatalogErrors } from "@/lib/catalogSupplierErrors";
import { searchCatalog } from "@/services/pricing/searchCatalog";

const MIN_QUERY = 2;

/**
 * Derive catalog search text and optional length/qty hints from a material list line.
 * Lines from catalog "Add to list" use middle-dot segments; plain notes use the first segment or whole line.
 */
export function catalogSearchArgsFromListLine(text: string): { query: string; parsed: ParsedLengthQty } {
  const trimmed = text.trim();
  const bulletParts = trimmed.split(/\s*·\s*/u).map((p) => p.trim()).filter(Boolean);
  const query = (bulletParts[0] ?? trimmed).trim() || trimmed;

  const lenM = trimmed.match(/\b(\d+(?:\.\d+)?)\s*(ft|m)\b/i);
  let length: number | undefined;
  let lengthUnit: "ft" | "m" = "ft";
  if (lenM) {
    length = parseLengthInput(lenM[1] ?? "");
    const u = (lenM[2] ?? "ft").toLowerCase();
    lengthUnit = u === "m" ? "m" : "ft";
  }

  const qtyM = trimmed.match(/\bqty\s*(\d+)/i);
  const qty = qtyM ? parseQtyInput(qtyM[1] ?? "1") : 1;

  const parsed: ParsedLengthQty = {
    length,
    lengthUnit,
    qty,
  };
  return { query, parsed };
}

export type PricedVendorRow = {
  presetId: SupplyHousePresetId;
  label: string;
  match: ProductWithPricing | null;
  unitLabel: string;
  lineTotalLabel: string | null;
};

export type PricedMaterialLineResult = {
  sourceLine: string;
  query: string;
  catalog: PricingSearchOutcome | null;
  catalogError: string | null;
  vendors: PricedVendorRow[];
  bestVendorLabel: string | null;
  bestLineTotal: number | null;
};

function lineTotalNumeric(match: ProductWithPricing, parsed: ParsedLengthQty): number | null {
  const adj =
    parsed.length !== undefined
      ? computeLengthPricingAdjustment(match, {
          length: parsed.length,
          lengthUnit: parsed.lengthUnit,
        })
      : null;
  const u = adj?.adjustedUnitPrice ?? parseUnitPrice(match.price);
  if (u === null) return null;
  return u * parsed.qty;
}

export function summarizeLinePricing(
  outcome: PricingSearchOutcome,
  presetIds: SupplyHousePresetId[],
  parsed: ParsedLengthQty,
): { vendors: PricedVendorRow[]; bestVendorLabel: string | null; bestLineTotal: number | null } {
  let bestVendorLabel: string | null = null;
  let bestLineTotal: number | null = null;

  const vendors: PricedVendorRow[] = presetIds.map((presetId) => {
    const match = bestCatalogMatch(outcome.results, presetId, parsed);
    const eff = match ? formatEffectivePrice(match, parsed.qty, parsed) : null;
    const lineTotalNum = match ? lineTotalNumeric(match, parsed) : null;

    if (lineTotalNum !== null) {
      if (bestLineTotal === null || lineTotalNum < bestLineTotal) {
        bestLineTotal = lineTotalNum;
        bestVendorLabel = labelForSupplyHousePreset(presetId);
      }
    }

    return {
      presetId,
      label: labelForSupplyHousePreset(presetId),
      match,
      unitLabel: eff?.unitLabel ?? "—",
      lineTotalLabel: eff?.lineTotal ?? eff?.unitLabel ?? null,
    };
  });

  return { vendors, bestVendorLabel, bestLineTotal };
}

export async function priceMaterialListLinesSequential(opts: {
  lines: string[];
  throttleMs?: number;
  shouldCancel?: () => boolean;
  onProgress?: (completed: number, total: number) => void;
}): Promise<PricedMaterialLineResult[]> {
  const presetIds = await loadVendorPresetsForMaterialPricing();
  const throttleMs = opts.throttleMs ?? 420;
  const results: PricedMaterialLineResult[] = [];
  const total = opts.lines.length;

  for (let i = 0; i < opts.lines.length; i++) {
    if (opts.shouldCancel?.()) break;
    const sourceLine = opts.lines[i] ?? "";
    const { query, parsed } = catalogSearchArgsFromListLine(sourceLine);

    if (query.length < MIN_QUERY) {
      results.push({
        sourceLine,
        query,
        catalog: null,
        catalogError: `Need at least ${MIN_QUERY} characters in the search part of this line.`,
        vendors: [],
        bestVendorLabel: null,
        bestLineTotal: null,
      });
      opts.onProgress?.(results.length, total);
      if (i < opts.lines.length - 1 && throttleMs > 0) {
        await new Promise((r) => setTimeout(r, throttleMs));
      }
      continue;
    }

    let catalog: PricingSearchOutcome;
    try {
      catalog = await searchCatalog(query, {
        length: parsed.length,
        lengthUnit: parsed.lengthUnit,
        qty: parsed.qty,
        vendorPresets: presetIds,
      });
    } catch (e) {
      results.push({
        sourceLine,
        query,
        catalog: null,
        catalogError: e instanceof Error ? e.message : "Search failed.",
        vendors: [],
        bestVendorLabel: null,
        bestLineTotal: null,
      });
      opts.onProgress?.(results.length, total);
      if (i < opts.lines.length - 1 && throttleMs > 0) {
        await new Promise((r) => setTimeout(r, throttleMs));
      }
      continue;
    }

    const { vendors, bestVendorLabel, bestLineTotal } = summarizeLinePricing(catalog, presetIds, parsed);
    const catalogError =
      catalog.results.length === 0 && catalog.errors.length > 0
        ? summarizeCatalogErrors(catalog.errors)
        : null;
    results.push({
      sourceLine,
      query,
      catalog,
      catalogError,
      vendors,
      bestVendorLabel,
      bestLineTotal,
    });
    opts.onProgress?.(results.length, total);

    if (i < opts.lines.length - 1 && throttleMs > 0) {
      await new Promise((r) => setTimeout(r, throttleMs));
    }
  }

  return results;
}
