import {
  FT_PER_M,
  parsePackLengthFeet,
  productPackLengthFeet,
  requestedLengthFeet,
  type LengthUnit,
} from "@/lib/materialsLengthQtyShared";
import type { ProductWithPricing } from "@/services/pricing";

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

/**
 * Whether search length (e.g. 1000 ft) should adjust catalog unit price for this row.
 * Rules:
 * - Apply when UOM is ft/foot/LF or product is wire/cable/conduit with a known pack length.
 * - Skip when UOM is ea/box/case/pk/bundle or product is nails, devices, boxes, etc.
 */
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
  /** Catalog unit price before scaling. */
  catalogUnitPrice: number | null;
  /** Price per catalog UOM after optional length scaling. */
  adjustedUnitPrice: number | null;
  lengthHint: string | null;
  priceDetail: string | null;
};

export function parseCatalogUnitPrice(price: string | number | null | undefined): number | null {
  if (price === null || price === undefined) return null;
  const cleaned = String(price).replace(/[^0-9.]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatFeetLabel(feet: number, unit: LengthUnit): string {
  if (unit === "m") {
    const m = Math.round((feet / FT_PER_M) * 10) / 10;
    return `${m} m`;
  }
  return `${Math.round(feet)} ft`;
}

/**
 * Compute display unit price for a requested pack length when the product is length-based.
 * Proportional scale when catalog pack length differs (e.g. 250 ft roll priced for 1000 ft request).
 */
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
    lengthHint: null,
    priceDetail: null,
  };

  if (requested?.length === undefined || requested.length <= 0) return empty;
  if (!shouldApplyLengthPricing(row)) return empty;

  const requestedFeet = requestedLengthFeet(requested.length, requested.lengthUnit);
  const packFeet = productPackLengthFeet(row);

  if (catalogUnitPrice === null) {
    return {
      ...empty,
      lengthApplied: true,
      requestedFeet,
      lengthHint: `Length pricing: ${formatFeetLabel(requestedFeet, requested.lengthUnit)}`,
    };
  }

  if (packFeet === null) {
    return {
      ...empty,
      lengthApplied: true,
      requestedFeet,
      adjustedUnitPrice: catalogUnitPrice,
      lengthHint: `Est. for ${formatFeetLabel(requestedFeet, requested.lengthUnit)} (pack length unknown)`,
    };
  }

  const ratio = packFeet / requestedFeet;
  if (Math.abs(ratio - 1) < 0.02) {
    const packLabel = formatFeetLabel(packFeet, "ft");
    return {
      lengthApplied: true,
      lengthScaled: false,
      packFeet,
      requestedFeet,
      catalogUnitPrice,
      adjustedUnitPrice: catalogUnitPrice,
      lengthHint: `${packLabel} pack`,
      priceDetail: null,
    };
  }

  const scaleFactor = requestedFeet / packFeet;
  const adjustedUnitPrice = catalogUnitPrice * scaleFactor;
  const packLabel = formatFeetLabel(packFeet, "ft");
  const wantLabel = formatFeetLabel(requestedFeet, requested.lengthUnit);
  const rolls = Math.round((scaleFactor + Number.EPSILON) * 100) / 100;
  const rollsLabel =
    rolls >= 1.9 && Math.abs(rolls - Math.round(rolls)) < 0.05
      ? `${Math.round(rolls)}× ${packLabel}`
      : `${packLabel} → ${wantLabel}`;

  return {
    lengthApplied: true,
    lengthScaled: true,
    packFeet,
    requestedFeet,
    catalogUnitPrice,
    adjustedUnitPrice,
    lengthHint: `Est. for ${wantLabel} (${rollsLabel} @ catalog price)`,
    priceDetail: `Scaled from ${packLabel} catalog price`,
  };
}
