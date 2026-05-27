/**
 * Match pricing-backend `supplier` strings to a supply-house preset id (aligns with my-app supplierPresets).
 */
const PRESET_DISPLAY: Record<string, string> = {
  homedepot: "Home Depot",
  lowes: "Lowe's",
  grainger: "Grainger",
  graybar: "Graybar",
  rexel: "Rexel USA",
  johnstone: "Johnstone Supply",
  platt: "Platt Electric",
  wesco: "Wesco",
  cityelectric: "City Electric Supply",
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const ALLOWED_VENDOR_PRESETS = new Set(Object.keys(PRESET_DISPLAY));

export function isAllowedVendorPreset(preset: string): boolean {
  return ALLOWED_VENDOR_PRESETS.has(preset.trim().toLowerCase());
}

/** True when a product row belongs to the given supply-house preset. */
export function matchesVendorPreset(supplier: string, presetId: string): boolean {
  const pid = presetId.trim().toLowerCase();
  const s = norm(supplier);
  const id = norm(pid);
  const label = norm(PRESET_DISPLAY[pid] ?? presetId);
  if (!s) return false;
  if (s === id || s.includes(id) || id.includes(s)) return true;
  if (label.length >= 4 && (s.includes(label) || label.includes(s))) return true;
  return false;
}
