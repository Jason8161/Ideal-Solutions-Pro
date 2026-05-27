import {
  computeLengthPricingAdjustment,
  parseCatalogUnitPrice,
} from "@/lib/lengthBasedPricing";
import {
  formatVendorPrice,
  type ParsedLengthQty,
} from "@/lib/materialsLengthQtyShared";
import { labelForSupplyHousePreset, type SupplyHousePresetId } from "@/lib/supplierPresets";
import type { ProductWithPricing } from "@/services/pricing";

export type { LengthUnit, ParsedLengthQty } from "@/lib/materialsLengthQtyShared";

export function parseLengthInput(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function parseQtyInput(raw: string): number {
  const t = raw.trim();
  if (!t) return 1;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 9_999);
}

export { parsePackLengthFeet, productPackLengthFeet, requestedLengthFeet, lengthMatchScore } from "@/lib/materialsLengthQtyShared";

export function parseUnitPrice(price: string | number | null | undefined): number | null {
  return parseCatalogUnitPrice(price);
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export type EffectivePriceDisplay = {
  unitLabel: string;
  lineTotal: string | null;
  detail: string | null;
  /** Query length was used for length-based wire/cable pricing. */
  lengthApplied?: boolean;
};

export function formatEffectivePrice(
  match: ProductWithPricing,
  qty: number,
  parsed?: Pick<ParsedLengthQty, "length" | "lengthUnit">,
): EffectivePriceDisplay {
  const lengthAdj =
    parsed?.length !== undefined
      ? computeLengthPricingAdjustment(match, {
          length: parsed.length,
          lengthUnit: parsed.lengthUnit,
        })
      : null;

  const unit =
    lengthAdj?.adjustedUnitPrice ?? parseUnitPrice(match.price);
  const unitLabel = unit === null ? formatVendorPrice(match.price) : formatMoney(unit);
  const lengthApplied = lengthAdj?.lengthApplied ?? false;
  const scaleDetail = lengthAdj?.priceDetail ?? null;

  if (unit === null) {
    return {
      unitLabel: formatVendorPrice(match.price),
      lineTotal: null,
      detail: qty > 1 ? `× ${qty}` : scaleDetail,
      lengthApplied,
    };
  }
  const total = unit * qty;
  const qtyDetail = qty > 1 ? `${unitLabel} × ${qty}` : null;
  const detail = [scaleDetail, qtyDetail].filter(Boolean).join(" · ") || null;
  if (qty <= 1) {
    return { unitLabel, lineTotal: unitLabel, detail, lengthApplied };
  }
  return {
    unitLabel,
    lineTotal: formatMoney(total),
    detail,
    lengthApplied,
  };
}

/** Subtitle under vendor card — only when length-based pricing was applied. */
export function formatLengthQtyHint(
  parsed: ParsedLengthQty,
  match: ProductWithPricing | null,
): string | null {
  if (parsed.length === undefined || !match) return null;
  const adj = computeLengthPricingAdjustment(match, {
    length: parsed.length,
    lengthUnit: parsed.lengthUnit,
  });
  return adj.lengthApplied ? adj.lengthHint : null;
}

export function formatMaterialListLine(opts: {
  query: string;
  presetId: SupplyHousePresetId;
  match: ProductWithPricing;
  parsed: ParsedLengthQty;
}): string {
  const vendor = labelForSupplyHousePreset(opts.presetId);
  const eff = formatEffectivePrice(opts.match, opts.parsed.qty, opts.parsed);
  const parts = [opts.match.name.trim() || opts.query.trim(), vendor];
  if (eff.lengthApplied && opts.parsed.length !== undefined) {
    parts.push(`${opts.parsed.length} ${opts.parsed.lengthUnit}`);
  }
  if (opts.parsed.qty > 1) {
    parts.push(`qty ${opts.parsed.qty}`);
  }
  const pricePart = eff.lineTotal ?? eff.unitLabel;
  if (eff.detail && opts.parsed.qty > 1) {
    parts.push(`${eff.detail} = ${pricePart}`);
  } else {
    parts.push(pricePart);
  }
  return parts.join(" · ");
}
