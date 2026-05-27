import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ideal_solutions_materials_always_location";

export async function loadMaterialsAlwaysLocation(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "true" || v === "1";
  } catch {
    return false;
  }
}

export async function saveMaterialsAlwaysLocation(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, value ? "true" : "false");
}
