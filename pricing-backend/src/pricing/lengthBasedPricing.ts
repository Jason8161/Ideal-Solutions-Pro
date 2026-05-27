import type { ProductWithPricing } from "./contracts";
import {
  parsePackLengthFeet,
  productPackLengthFeet,
  requestedLengthFeet,
  type LengthUnit,
} from "./lengthQty";

/** UOM tokens that mean per-piece / per-box — never scale by search length (ft). */
const COUNT_UOM_RE =
  /\b(ea|each|pc|pcs|piece|pieces|pair|pr|box|case|cs|pk|pack|pkg|package|bundle|bag|bg|carton|ct|set|lot|lb|lbs|pound|kg|gallon|gal|qt|quart|count|cnt)\b/i;

/** UOM or unit text that indicates price is per foot / per meter. */
const LENGTH_UOM_RE =
  /\b(ft|feet|foot|footage|lf|linear\s*ft|per\s*ft|\/\s*ft|')\b|\b\d+\s*ft\b/i;

/** Product text for wire, cable, conduit sold by length (not devices/fasteners). */
const LENGTH_PRODUCT_RE =
  /\b(romex|nm-?b|nmb|mc\s*cable|uf-?b|bx\s*cable|ac\s*cable|thhn|thwn|building\s*wire|feeder\s*wire|copper\s*wire|conductor|cable|wire|conduit|emt|ent|pvc\s*(?:pipe|conduit)|raceway|tray\s*cable|soow|seoow|use-2|urdd|welding\s*cable)\b/i;

/** Fasteners, devices, boxes — count/box UOM even if query mentions feet. */
const COUNT_PRODUCT_RE =
  /\b(nails?|screws?|staples?|bolts?|nuts?|washers?|anchors?|hangers?|straps?|ties?|clips?|breakers?|gfci|afci|receptacles?|outlets?|switches?|dimmers?|cover\s*plate|wall\s*plate|load\s*center|panelboard|meter\s*base|transformers?|ballasts?|fixtures?|lamps?|bulbs?)\b/i;

function productHaystack(row: ProductWithPricing): string {
  return `${row.name} ${row.description ?? ""} ${row.sku ?? ""} ${row.unit ?? ""} ${row.unitOfMeasure ?? ""} ${row.category ?? ""}`
    .toLowerCase()
    .trim();
}

function fieldSuggestsCountUom(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return COUNT_UOM_RE.test(t);
}

function fieldSuggestsLengthUom(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return LENGTH_UOM_RE.test(t) || parsePackLengthFeet(t) !== null;
}

/** Whether search length should adjust catalog unit price for this row. */
export function shouldApplyLengthPricing(row: ProductWithPricing): boolean {
  const hay = productHaystack(row);
  const unitFields = [row.unit, row.unitOfMeasure].filter(Boolean).map(String);

  for (const f of unitFields) {
    if (fieldSuggestsCountUom(f) && !fieldSuggestsLengthUom(f)) return false;
  }

  if (COUNT_PRODUCT_RE.test(hay) && !LENGTH_PRODUCT_RE.test(hay)) return false;

  for (const f of unitFields) {
    if (fieldSuggestsLengthUom(f)) return true;
  }

  if (LENGTH_PRODUCT_RE.test(hay) && productPackLengthFeet(row) !== null) return true;
  if (LENGTH_PRODUCT_RE.test(hay) && !fieldSuggestsCountUom(hay)) return true;

  return false;
}

export type LengthPricingAdjustment = {
  lengthApplied: boolean;
  lengthScaled: boolean;
  packFeet: number | null;
  requestedFeet: number | null;
  catalogUnitPrice: number | null;
  adjustedUnitPrice: number | null;
};

function parseCatalogUnitPrice(price: string | number | null | undefined): number | null {
  if (price === null || price === undefined) return null;
  const cleaned = String(price).replace(/[^0-9.]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Proportional unit price when catalog pack length differs from requested length. */
export function computeLengthPricingAdjustment(
  row: ProductWithPricing,
  requested?: { length: number; lengthUnit: LengthUnit },
): LengthPricingAdjustment {
  const catalogUnitPrice = parseCatalogUnitPrice(row.price);
  const empty: LengthPricingAdjustment = {
    lengthApplied: false,
    lengthScaled: false,
    packFeet: productPackLengthFeet(row),
    requestedFeet: null,
    catalogUnitPrice,
    adjustedUnitPrice: catalogUnitPrice,
  };

  if (requested?.length === undefined || requested.length <= 0) return empty;
  if (!shouldApplyLengthPricing(row)) return empty;

  const requestedFeet = requestedLengthFeet(requested.length, requested.lengthUnit);
  const packFeet = productPackLengthFeet(row);

  if (catalogUnitPrice === null) {
    return { ...empty, lengthApplied: true, requestedFeet };
  }

  if (packFeet === null) {
    return { ...empty, lengthApplied: true, requestedFeet, adjustedUnitPrice: catalogUnitPrice };
  }

  const ratio = packFeet / requestedFeet;
  if (Math.abs(ratio - 1) < 0.02) {
    return {
      lengthApplied: true,
      lengthScaled: false,
      packFeet,
      requestedFeet,
      catalogUnitPrice,
      adjustedUnitPrice: catalogUnitPrice,
    };
  }

  const scaleFactor = requestedFeet / packFeet;
  return {
    lengthApplied: true,
    lengthScaled: true,
    packFeet,
    requestedFeet,
    catalogUnitPrice,
    adjustedUnitPrice: catalogUnitPrice * scaleFactor,
  };
}

/** Adjust `price` on length-based rows when user requested a different pack length. */
export function applyLengthAdjustedPrices(
  results: ProductWithPricing[],
  options: { length?: number; lengthUnit?: LengthUnit },
): ProductWithPricing[] {
  if (options.length === undefined || options.length <= 0) return results;
  const requested = { length: options.length, lengthUnit: options.lengthUnit ?? "ft" };

  return results.map((row) => {
    const adj = computeLengthPricingAdjustment(row, requested);
    if (!adj.lengthApplied || !adj.lengthScaled || adj.adjustedUnitPrice === null) return row;
    return { ...row, price: adj.adjustedUnitPrice.toFixed(2) };
  });
}
