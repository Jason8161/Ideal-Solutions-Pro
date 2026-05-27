import { aiDisclaimer } from "./aiDisclaimer";
import { dataDeletionPolicy } from "./dataDeletionPolicy";
import { eula } from "./eula";
import { gpsConsentPolicy } from "./gpsConsentPolicy";
import { privacyPolicy } from "./privacyPolicy";
import { termsOfService } from "./termsOfService";

export const LEGAL_POLICY_VERSION = "1.0.0";
export const LEGAL_LAST_UPDATED = "May 26, 2026";

export type LegalStuffDocId =
  | "privacy"
  | "terms"
  | "aiDisclaimer"
  | "gpsConsent"
  | "dataDeletion"
  | "eula";

export type LegalDocumentConstant = {
  id: LegalStuffDocId;
  title: string;
  lastUpdated: string;
  version: string;
  content: string;
  checkboxLabel: string;
};

const CHECKBOX_LABELS: Record<LegalStuffDocId, string> = {
  privacy: "I have read and agree to the Privacy Policy",
  terms: "I have read and agree to the Terms of Service",
  aiDisclaimer: "I have read and agree to the AI Disclaimer",
  gpsConsent: "I have read and agree to the Employee GPS Consent Policy",
  dataDeletion: "I have read and agree to the Account & Data Deletion Policy",
  eula: "I have read and agree to the EULA / Software License Agreement",
};

function toDoc(id: LegalStuffDocId, source: typeof privacyPolicy): LegalDocumentConstant {
  return {
    id,
    title: source.title,
    lastUpdated: source.lastUpdated,
    version: source.version,
    content: source.content,
    checkboxLabel: CHECKBOX_LABELS[id],
  };
}

export const LEGAL_STUFF_DOCUMENTS: readonly LegalDocumentConstant[] = [
  toDoc("privacy", privacyPolicy),
  toDoc("terms", termsOfService),
  toDoc("aiDisclaimer", aiDisclaimer),
  toDoc("gpsConsent", gpsConsentPolicy),
  toDoc("dataDeletion", dataDeletionPolicy),
  toDoc("eula", eula),
] as const;

export const LEGAL_STUFF_DOC_IDS: readonly LegalStuffDocId[] = LEGAL_STUFF_DOCUMENTS.map(
  (d) => d.id,
);

export function getLegalStuffDocument(id: LegalStuffDocId): LegalDocumentConstant {
  const doc = LEGAL_STUFF_DOCUMENTS.find((d) => d.id === id);
  if (!doc) {
    throw new Error(`Unknown legal document: ${id}`);
  }
  return doc;
}

export function isLegalStuffDocId(value: string): value is LegalStuffDocId {
  return LEGAL_STUFF_DOC_IDS.includes(value as LegalStuffDocId);
}
