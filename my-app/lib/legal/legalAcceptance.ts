import AsyncStorage from "@react-native-async-storage/async-storage";

import { DISCLOSURE_DOC_IDS, getLegalDocument } from "@/lib/legal/legalDocuments";
import type { LegalAcceptances, LegalDocId, LegalFlowStep } from "@/lib/legal/types";

export const LEGAL_ACCEPTANCES_STORAGE_KEY = "ideal_legal_acceptances_v1";

/** Legacy / mirrored Terms acceptance key (version `"2026-05-24"`). */
export const LEGACY_TERMS_KEY = "ideal_terms_accepted_v1";

/** Legacy Services Description ack; migrated on read. */
const LEGACY_SERVICES_DESCRIPTION_KEY = "ideal_services_description_ack_v1";

function isCurrentAcceptance(
  record: { version: string } | undefined,
  expectedVersion: string,
): boolean {
  return record?.version === expectedVersion;
}

export async function loadLegalAcceptances(): Promise<LegalAcceptances> {
  try {
    const raw = await AsyncStorage.getItem(LEGAL_ACCEPTANCES_STORAGE_KEY);
    let parsed: LegalAcceptances = raw ? (JSON.parse(raw) as LegalAcceptances) : {};

    let migrated = false;

    if (!parsed.terms) {
      const legacyRaw = await AsyncStorage.getItem(LEGACY_TERMS_KEY);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw) as { acceptedAt?: string; version?: string };
          if (legacy.acceptedAt && legacy.version) {
            parsed = {
              ...parsed,
              terms: { acceptedAt: legacy.acceptedAt, version: legacy.version },
            };
            migrated = true;
          }
        } catch {
          // ignore corrupt legacy payload
        }
      }
    }

    if (!parsed.servicesDescription) {
      const legacyServicesRaw = await AsyncStorage.getItem(LEGACY_SERVICES_DESCRIPTION_KEY);
      if (legacyServicesRaw) {
        try {
          const legacy = JSON.parse(legacyServicesRaw) as { acceptedAt?: string; version?: string };
          if (legacy.acceptedAt && legacy.version) {
            parsed = {
              ...parsed,
              servicesDescription: { acceptedAt: legacy.acceptedAt, version: legacy.version },
            };
            migrated = true;
          }
        } catch {
          // ignore corrupt legacy payload
        }
      }
    }

    if (migrated) {
      await saveLegalAcceptances(parsed);
    }

    return parsed;
  } catch {
    return {};
  }
}

export async function saveLegalAcceptances(acceptances: LegalAcceptances): Promise<boolean> {
  try {
    await AsyncStorage.setItem(LEGAL_ACCEPTANCES_STORAGE_KEY, JSON.stringify(acceptances));
    return true;
  } catch {
    return false;
  }
}

export async function acceptLegalDocument(
  id: LegalDocId,
  existing?: LegalAcceptances,
): Promise<{ acceptances: LegalAcceptances; saved: boolean }> {
  const doc = getLegalDocument(id);
  const now = new Date().toISOString();
  const current = existing ?? (await loadLegalAcceptances());
  const next: LegalAcceptances = {
    ...current,
    [id]: { acceptedAt: now, version: doc.version },
  };
  const saved = await saveLegalAcceptances(next);
  if (id === "terms" && saved) {
    try {
      await AsyncStorage.setItem(
        LEGACY_TERMS_KEY,
        JSON.stringify({ acceptedAt: now, version: doc.version }),
      );
    } catch {
      // Non-fatal; unified store is primary.
    }
  }
  return { acceptances: next, saved };
}

export async function acceptDisclosureDocuments(
  existing?: LegalAcceptances,
): Promise<{ acceptances: LegalAcceptances; saved: boolean }> {
  const now = new Date().toISOString();
  const current = existing ?? (await loadLegalAcceptances());
  const next: LegalAcceptances = { ...current };

  for (const id of DISCLOSURE_DOC_IDS) {
    const doc = getLegalDocument(id);
    next[id] = { acceptedAt: now, version: doc.version };
  }

  const saved = await saveLegalAcceptances(next);
  return { acceptances: next, saved };
}

export function getNextLegalFlowStep(acceptances: LegalAcceptances): LegalFlowStep {
  const termsDoc = getLegalDocument("terms");
  if (!isCurrentAcceptance(acceptances.terms, termsDoc.version)) {
    return "terms";
  }

  for (const id of DISCLOSURE_DOC_IDS) {
    const doc = getLegalDocument(id);
    if (!isCurrentAcceptance(acceptances[id], doc.version)) {
      return "disclosures";
    }
  }

  return null;
}

export function isLegalFlowComplete(acceptances: LegalAcceptances): boolean {
  return getNextLegalFlowStep(acceptances) === null;
}
