import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import {
  LEGAL_POLICY_VERSION,
  LEGAL_STUFF_DOC_IDS,
  type LegalStuffDocId,
} from "@/constants/legal";

export const LEGAL_STUFF_ACCEPTANCE_STORAGE_KEY = "ideal_legal_stuff_acceptance_v1";

export type LegalStuffAcceptanceTimestamps = {
  acceptedPrivacyPolicyAt: string | null;
  acceptedTermsAt: string | null;
  acceptedAiDisclaimerAt: string | null;
  acceptedGpsConsentAt: string | null;
  acceptedDataDeletionPolicyAt: string | null;
  acceptedEulaAt: string | null;
};

export type LegalStuffAcceptanceRecord = LegalStuffAcceptanceTimestamps & {
  policyVersion: string;
  appVersion: string;
};

const DOC_TO_FIELD: Record<LegalStuffDocId, keyof LegalStuffAcceptanceTimestamps> = {
  privacy: "acceptedPrivacyPolicyAt",
  terms: "acceptedTermsAt",
  aiDisclaimer: "acceptedAiDisclaimerAt",
  gpsConsent: "acceptedGpsConsentAt",
  dataDeletion: "acceptedDataDeletionPolicyAt",
  eula: "acceptedEulaAt",
};

export function getAppVersionLabel(): string {
  return Constants.expoConfig?.version ?? "1.0.0";
}

function emptyRecord(): LegalStuffAcceptanceRecord {
  return {
    acceptedPrivacyPolicyAt: null,
    acceptedTermsAt: null,
    acceptedAiDisclaimerAt: null,
    acceptedGpsConsentAt: null,
    acceptedDataDeletionPolicyAt: null,
    acceptedEulaAt: null,
    policyVersion: "",
    appVersion: "",
  };
}

export async function loadLegalStuffAcceptance(): Promise<LegalStuffAcceptanceRecord> {
  try {
    const raw = await AsyncStorage.getItem(LEGAL_STUFF_ACCEPTANCE_STORAGE_KEY);
    if (!raw) return emptyRecord();
    const parsed = JSON.parse(raw) as Partial<LegalStuffAcceptanceRecord>;
    return { ...emptyRecord(), ...parsed };
  } catch {
    return emptyRecord();
  }
}

export async function saveLegalStuffAcceptance(record: LegalStuffAcceptanceRecord): Promise<boolean> {
  try {
    await AsyncStorage.setItem(LEGAL_STUFF_ACCEPTANCE_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function isLegalStuffAcceptanceCurrent(record: LegalStuffAcceptanceRecord): boolean {
  if (record.policyVersion !== LEGAL_POLICY_VERSION) return false;
  for (const id of LEGAL_STUFF_DOC_IDS) {
    const field = DOC_TO_FIELD[id];
    if (!record[field]) return false;
  }
  return true;
}

export function needsLegalStuffReacceptance(record: LegalStuffAcceptanceRecord): boolean {
  const hasAny =
    record.acceptedPrivacyPolicyAt != null ||
    record.acceptedTermsAt != null ||
    record.acceptedAiDisclaimerAt != null ||
    record.acceptedGpsConsentAt != null ||
    record.acceptedDataDeletionPolicyAt != null ||
    record.acceptedEulaAt != null;

  if (!hasAny) return false;
  return !isLegalStuffAcceptanceCurrent(record);
}

export async function acceptAllLegalStuffDocuments(): Promise<{
  record: LegalStuffAcceptanceRecord;
  saved: boolean;
}> {
  const now = new Date().toISOString();
  const record: LegalStuffAcceptanceRecord = {
    acceptedPrivacyPolicyAt: now,
    acceptedTermsAt: now,
    acceptedAiDisclaimerAt: now,
    acceptedGpsConsentAt: now,
    acceptedDataDeletionPolicyAt: now,
    acceptedEulaAt: now,
    policyVersion: LEGAL_POLICY_VERSION,
    appVersion: getAppVersionLabel(),
  };
  const saved = await saveLegalStuffAcceptance(record);
  return { record, saved };
}

export function toSupabaseLegalAcceptancePayload(
  record: LegalStuffAcceptanceRecord,
): LegalStuffAcceptanceTimestamps & { policyVersion: string; appVersion: string } {
  return {
    acceptedPrivacyPolicyAt: record.acceptedPrivacyPolicyAt,
    acceptedTermsAt: record.acceptedTermsAt,
    acceptedAiDisclaimerAt: record.acceptedAiDisclaimerAt,
    acceptedGpsConsentAt: record.acceptedGpsConsentAt,
    acceptedDataDeletionPolicyAt: record.acceptedDataDeletionPolicyAt,
    acceptedEulaAt: record.acceptedEulaAt,
    policyVersion: record.policyVersion,
    appVersion: record.appVersion,
  };
}
