import {
  abcSupplySearchUrl,
  bakerSearchUrl,
  beaconSearchUrl,
  cedSearchUrl,
  cityElectricSearchUrl,
  fergusonSearchUrl,
  gexproSearchUrl,
  graingerSearchUrl,
  graybarSearchUrl,
  hajocaSearchUrl,
  homeDepotSearchUrl,
  johnstoneSearchUrl,
  lowesSearchUrl,
  plattSearchUrl,
  rexelSearchUrl,
  standardElectricSearchUrl,
  wescoSearchUrl,
  winsupplySearchUrl,
  fastenalSearchUrl,
  elliottElectricSearchUrl,
  borderStatesSearchUrl,
} from "@/lib/retailUrls";

export type SupplyHousePresetId =
  | "homedepot"
  | "lowes"
  | "grainger"
  | "graybar"
  | "rexel"
  | "johnstone"
  | "platt"
  | "wesco"
  | "cityelectric"
  | "ferguson"
  | "hajoca"
  | "abc_supply"
  | "beacon"
  | "ced"
  | "gexpro"
  | "winsupply"
  | "baker"
  | "standard_electric"
  | "fastenal"
  | "elliott_electric"
  | "border_states";

export type SupplyHouseSuggestion = {
  id: SupplyHousePresetId;
  label: string;
  hint: string;
};

/** Suggested supply houses the user can add manually (opens each vendor’s own search / catalog). */
export const SUPPLY_HOUSE_SUGGESTIONS: readonly SupplyHouseSuggestion[] = [
  { id: "homedepot", label: "Home Depot", hint: "Big-box store search" },
  { id: "lowes", label: "Lowe’s", hint: "Big-box store search" },
  { id: "grainger", label: "Grainger", hint: "Industrial / MRO catalog" },
  { id: "graybar", label: "Graybar", hint: "Electrical distributor" },
  { id: "rexel", label: "Rexel USA", hint: "Electrical distributor" },
  { id: "wesco", label: "Wesco", hint: "Electrical / datacom distributor" },
  { id: "platt", label: "Platt Electric", hint: "Electrical wholesale" },
  { id: "cityelectric", label: "City Electric Supply", hint: "Counter / branch search" },
  { id: "ced", label: "CED", hint: "Consolidated Electrical Distributors" },
  { id: "gexpro", label: "Gexpro", hint: "Electrical distributor" },
  { id: "standard_electric", label: "Standard Electric", hint: "Electrical wholesale" },
  { id: "ferguson", label: "Ferguson", hint: "Plumbing / HVAC / waterworks" },
  { id: "hajoca", label: "Hajoca", hint: "Plumbing wholesaler" },
  { id: "winsupply", label: "WinSupply", hint: "Plumbing / HVAC distribution" },
  { id: "johnstone", label: "Johnstone Supply", hint: "HVAC wholesaler" },
  { id: "baker", label: "Baker Distributing", hint: "HVAC/R refrigeration" },
  { id: "abc_supply", label: "ABC Supply", hint: "Roofing / siding / exterior" },
  { id: "beacon", label: "Beacon Building Products", hint: "Roofing & exterior supply" },
  { id: "fastenal", label: "Fastenal", hint: "Industrial fasteners & MRO" },
  { id: "elliott_electric", label: "Elliott Electric", hint: "Electrical distributor" },
  { id: "border_states", label: "Border States", hint: "Electrical distributor" },
] as const;

const builders: Record<SupplyHousePresetId, (q: string) => string> = {
  homedepot: homeDepotSearchUrl,
  lowes: lowesSearchUrl,
  grainger: graingerSearchUrl,
  graybar: graybarSearchUrl,
  rexel: rexelSearchUrl,
  johnstone: johnstoneSearchUrl,
  platt: plattSearchUrl,
  wesco: wescoSearchUrl,
  cityelectric: cityElectricSearchUrl,
  ferguson: fergusonSearchUrl,
  hajoca: hajocaSearchUrl,
  abc_supply: abcSupplySearchUrl,
  beacon: beaconSearchUrl,
  ced: cedSearchUrl,
  gexpro: gexproSearchUrl,
  winsupply: winsupplySearchUrl,
  baker: bakerSearchUrl,
  standard_electric: standardElectricSearchUrl,
  fastenal: fastenalSearchUrl,
  elliott_electric: elliottElectricSearchUrl,
  border_states: borderStatesSearchUrl,
};

export function isSupplyHousePresetId(id: string): id is SupplyHousePresetId {
  return id in builders;
}

export function buildSupplyHouseSearchUrl(presetId: string, query: string): string | null {
  if (!isSupplyHousePresetId(presetId)) return null;
  return builders[presetId](query);
}

export function labelForSupplyHousePreset(presetId: string): string {
  const row = SUPPLY_HOUSE_SUGGESTIONS.find((s) => s.id === presetId);
  return row?.label ?? presetId;
}
