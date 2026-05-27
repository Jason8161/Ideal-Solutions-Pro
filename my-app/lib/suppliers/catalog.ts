import { destinationPoint, haversineMiles } from "@/lib/suppliers/distance";
import type { TradeCategory } from "@/lib/suppliers/types";
import type { Coords, NearbySupplyHouse, SearchRadiusMiles } from "@/lib/suppliers/types";
import {
  labelForSupplyHousePreset,
  SUPPLY_HOUSE_SUGGESTIONS,
  type SupplyHousePresetId,
} from "@/lib/supplierPresets";

export const ALWAYS_NEARBY_PRESETS: readonly SupplyHousePresetId[] = ["homedepot", "lowes"] as const;

type CatalogEntry = {
  presetId: SupplyHousePresetId;
  trades: readonly TradeCategory[];
  /** Typical distance band (mi) from origin for branch estimate. */
  minMi: number;
  maxMi: number;
};

function hashPreset(presetId: string): number {
  let h = 0;
  for (let i = 0; i < presetId.length; i++) h = (h * 31 + presetId.charCodeAt(i)) >>> 0;
  return h;
}

function nominalDistanceMi(presetId: string, minMi: number, maxMi: number): number {
  const span = Math.max(1, maxMi - minMi);
  return minMi + (hashPreset(presetId) % (span + 1));
}

function bearingForPreset(presetId: string): number {
  return hashPreset(`${presetId}:bearing`) % 360;
}

/** Curated wholesalers by trade (Home Depot / Lowe's added separately). */
export const SUPPLY_HOUSE_CATALOG: readonly CatalogEntry[] = [
  { presetId: "graybar", trades: ["electrical", "general"], minMi: 8, maxMi: 42 },
  { presetId: "rexel", trades: ["electrical", "general"], minMi: 10, maxMi: 48 },
  { presetId: "wesco", trades: ["electrical", "general"], minMi: 12, maxMi: 45 },
  { presetId: "platt", trades: ["electrical"], minMi: 15, maxMi: 50 },
  { presetId: "cityelectric", trades: ["electrical", "general"], minMi: 6, maxMi: 38 },
  { presetId: "ced", trades: ["electrical"], minMi: 14, maxMi: 48 },
  { presetId: "gexpro", trades: ["electrical"], minMi: 18, maxMi: 50 },
  { presetId: "standard_electric", trades: ["electrical"], minMi: 20, maxMi: 50 },
  { presetId: "ferguson", trades: ["plumbing", "hvac", "general"], minMi: 8, maxMi: 40 },
  { presetId: "hajoca", trades: ["plumbing"], minMi: 12, maxMi: 45 },
  { presetId: "winsupply", trades: ["plumbing", "hvac"], minMi: 10, maxMi: 42 },
  { presetId: "johnstone", trades: ["hvac", "plumbing"], minMi: 8, maxMi: 38 },
  { presetId: "baker", trades: ["hvac"], minMi: 15, maxMi: 48 },
  { presetId: "abc_supply", trades: ["siding_roofing", "general"], minMi: 10, maxMi: 45 },
  { presetId: "beacon", trades: ["siding_roofing"], minMi: 12, maxMi: 48 },
  { presetId: "grainger", trades: ["general", "electrical", "plumbing", "hvac"], minMi: 10, maxMi: 40 },
] as const;

function hintForPreset(presetId: SupplyHousePresetId): string {
  return SUPPLY_HOUSE_SUGGESTIONS.find((s) => s.id === presetId)?.hint ?? "Wholesale / distributor";
}

function bigBoxDistanceMi(presetId: SupplyHousePresetId): number {
  return 3 + (hashPreset(presetId) % 10);
}

function entryForPreset(
  origin: Coords,
  presetId: SupplyHousePresetId,
  opts: { alwaysShown: boolean; approximateDistance: boolean; minMi: number; maxMi: number },
): NearbySupplyHouse {
  const distanceMi = opts.alwaysShown
    ? bigBoxDistanceMi(presetId)
    : nominalDistanceMi(presetId, opts.minMi, opts.maxMi);
  const branch = destinationPoint(origin, bearingForPreset(presetId), distanceMi);
  const measured = haversineMiles(origin, branch);

  return {
    presetId,
    label: labelForSupplyHousePreset(presetId),
    hint: hintForPreset(presetId),
    distanceMiles: Math.round((opts.alwaysShown ? distanceMi : measured) * 10) / 10,
    alwaysShown: opts.alwaysShown,
    approximateDistance: opts.approximateDistance,
  };
}

export function computeNearbySupplyHouses(
  origin: Coords,
  radiusMiles: SearchRadiusMiles,
  trade: TradeCategory,
  approximateDistance: boolean,
): NearbySupplyHouse[] {
  const rows: NearbySupplyHouse[] = [];

  for (const id of ALWAYS_NEARBY_PRESETS) {
    rows.push(
      entryForPreset(origin, id, {
        alwaysShown: true,
        approximateDistance,
        minMi: 3,
        maxMi: 12,
      }),
    );
  }

  for (const entry of SUPPLY_HOUSE_CATALOG) {
    if (!entry.trades.includes(trade) && trade !== "general") continue;
    if (ALWAYS_NEARBY_PRESETS.includes(entry.presetId as (typeof ALWAYS_NEARBY_PRESETS)[number])) continue;

    const row = entryForPreset(origin, entry.presetId, {
      alwaysShown: false,
      approximateDistance,
      minMi: entry.minMi,
      maxMi: entry.maxMi,
    });

    if (row.distanceMiles != null && row.distanceMiles <= radiusMiles) {
      rows.push(row);
    }
  }

  rows.sort((a, b) => {
    if (a.alwaysShown !== b.alwaysShown) return a.alwaysShown ? -1 : 1;
    const da = a.distanceMiles ?? 9999;
    const db = b.distanceMiles ?? 9999;
    return da - db;
  });

  return rows;
}

/** Presets shown in the legacy “all suggestions” grid (trade + national chains). */
export function allSuggestionsForTrade(trade: TradeCategory): SupplyHousePresetId[] {
  const ids = new Set<SupplyHousePresetId>();
  for (const id of ALWAYS_NEARBY_PRESETS) ids.add(id);
  for (const entry of SUPPLY_HOUSE_CATALOG) {
    if (entry.trades.includes(trade) || trade === "general") ids.add(entry.presetId);
  }
  return [...ids];
}
