import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ideal_solutions_business_card_qr_v1";

export type BusinessCardQrSettings = {
  /** Exact string encoded into the QR (usually an https URL or app deep link). */
  encodedTarget: string;
};

export const DEFAULT_BUSINESS_CARD_QR: BusinessCardQrSettings = {
  encodedTarget: "",
};

export async function loadBusinessCardQrSettings(): Promise<BusinessCardQrSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BUSINESS_CARD_QR };
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_BUSINESS_CARD_QR };
    const encodedTarget =
      typeof (parsed as BusinessCardQrSettings).encodedTarget === "string"
        ? (parsed as BusinessCardQrSettings).encodedTarget
        : "";
    return { encodedTarget };
  } catch {
    return { ...DEFAULT_BUSINESS_CARD_QR };
  }
}

export async function saveBusinessCardQrSettings(settings: BusinessCardQrSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
