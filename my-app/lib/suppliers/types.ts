export type Coords = {
  latitude: number;
  longitude: number;
};

export type SearchRadiusMiles = 10 | 20 | 50;

export const SEARCH_RADIUS_OPTIONS: readonly SearchRadiusMiles[] = [10, 20, 50] as const;

/** Trade buckets used for curated supply-house suggestions. */
export type TradeCategory =
  | "electrical"
  | "plumbing"
  | "hvac"
  | "siding_roofing"
  | "general";

export type NearbySupplyHouse = {
  presetId: string;
  label: string;
  hint: string;
  distanceMiles: number | null;
  alwaysShown: boolean;
  approximateDistance: boolean;
};
