import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ideal_solutions_material_vendor_app_assignments_v1";

export type MaterialVendorAppAssignment = {
  /** Android launcher package chosen for this vendor tile. */
  androidPackage?: string;
};

type AssignmentMap = Record<string, MaterialVendorAppAssignment>;

function parseMap(raw: unknown): AssignmentMap {
  if (!raw || typeof raw !== "object") return {};
  const out: AssignmentMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length === 0) continue;
    if (!value || typeof value !== "object") continue;
    const androidPackage = (value as { androidPackage?: unknown }).androidPackage;
    if (typeof androidPackage === "string" && androidPackage.trim().length > 0) {
      out[key] = { androidPackage: androidPackage.trim() };
    }
  }
  return out;
}

async function loadMap(): Promise<AssignmentMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return parseMap(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

async function saveMap(map: AssignmentMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function loadMaterialVendorAppAssignment(
  vendorKey: string,
): Promise<MaterialVendorAppAssignment | null> {
  const map = await loadMap();
  return map[vendorKey] ?? null;
}

export async function saveMaterialVendorAppAssignment(
  vendorKey: string,
  assignment: MaterialVendorAppAssignment,
): Promise<void> {
  const map = await loadMap();
  if (!assignment.androidPackage) {
    delete map[vendorKey];
  } else {
    map[vendorKey] = { androidPackage: assignment.androidPackage };
  }
  await saveMap(map);
}

export async function clearMaterialVendorAppAssignment(vendorKey: string): Promise<void> {
  const map = await loadMap();
  delete map[vendorKey];
  await saveMap(map);
}
