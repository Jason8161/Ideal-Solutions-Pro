import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  LEGACY_TERMS_KEY,
  loadLegalAcceptances,
} from "@/lib/legal/legalAcceptance";

export { LEGACY_TERMS_KEY as TERMS_ACCEPTANCE_STORAGE_KEY } from "@/lib/legal/legalAcceptance";
export { TERMS_OF_SERVICE_VERSION } from "@/lib/legal/termsOfService";
import { TERMS_OF_SERVICE_VERSION } from "@/lib/legal/termsOfService";

export type TermsAcceptanceRecord = {
  acceptedAt: string;
  version: string;
};

export type TermsAcceptanceLoadResult =
  | { ok: true; record: TermsAcceptanceRecord | null; current: boolean }
  | { ok: false; record: null; current: false };

export function isTermsAcceptanceCurrent(record: TermsAcceptanceRecord | null): boolean {
  return record?.version === TERMS_OF_SERVICE_VERSION;
}

/** Reads mirrored legacy key, then falls back to unified legal store. */
export async function loadTermsAcceptance(): Promise<TermsAcceptanceLoadResult> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_TERMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TermsAcceptanceRecord>;
      if (typeof parsed.acceptedAt === "string" && typeof parsed.version === "string") {
        const record = { acceptedAt: parsed.acceptedAt, version: parsed.version };
        return { ok: true, record, current: isTermsAcceptanceCurrent(record) };
      }
    }

    const unified = await loadLegalAcceptances();
    if (unified.terms) {
      return {
        ok: true,
        record: unified.terms,
        current: isTermsAcceptanceCurrent(unified.terms),
      };
    }

    return { ok: true, record: null, current: false };
  } catch {
    return { ok: false, record: null, current: false };
  }
}

export async function saveTermsAcceptance(): Promise<boolean> {
  const record: TermsAcceptanceRecord = {
    acceptedAt: new Date().toISOString(),
    version: TERMS_OF_SERVICE_VERSION,
  };
  try {
    await AsyncStorage.setItem(LEGACY_TERMS_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
