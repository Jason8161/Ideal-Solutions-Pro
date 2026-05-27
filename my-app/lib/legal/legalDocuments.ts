import { DATA_PRIVACY_NOTICE_VERSION, getDataPrivacyNoticeText } from "@/lib/legal/dataPrivacyNotice";
import { LIABILITY_NOTICE_VERSION, getLiabilityNoticeText } from "@/lib/legal/liabilityNotice";
import { TERMS_OF_SERVICE_VERSION, getTermsOfServiceText } from "@/lib/legal/termsOfService";
import type { LegalDocId } from "@/lib/legal/types";
import {
  UPDATED_SERVICES_DESCRIPTION_VERSION,
  getUpdatedServicesDescriptionText,
} from "@/lib/legal/updatedServicesDescription";
import type { CompanyProfile } from "@/lib/profileStorage";

export type LegalDocumentMeta = {
  id: LegalDocId;
  title: string;
  version: string;
  checkboxLabel: string;
  getText: (profile?: Partial<CompanyProfile> | null) => string;
};

export const LEGAL_DOCUMENTS: readonly LegalDocumentMeta[] = [
  {
    id: "terms",
    title: "Terms of Service",
    version: TERMS_OF_SERVICE_VERSION,
    checkboxLabel: "I have read and agree to the Terms of Service",
    getText: getTermsOfServiceText,
  },
  {
    id: "servicesDescription",
    title: "Updated Services Description",
    version: UPDATED_SERVICES_DESCRIPTION_VERSION,
    checkboxLabel: "I acknowledge the Services Description",
    getText: () => getUpdatedServicesDescriptionText(),
  },
  {
    id: "dataPrivacy",
    title: "Data & Privacy",
    version: DATA_PRIVACY_NOTICE_VERSION,
    checkboxLabel: "I acknowledge the Data & Privacy notice",
    getText: () => getDataPrivacyNoticeText(),
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    version: LIABILITY_NOTICE_VERSION,
    checkboxLabel: "I acknowledge the Limitation of Liability",
    getText: () => getLiabilityNoticeText(),
  },
] as const;

/** Disclosures shown together after Terms (single scroll + one accept). */
export const DISCLOSURE_DOC_IDS: readonly LegalDocId[] = [
  "servicesDescription",
  "dataPrivacy",
  "liability",
];

export function getLegalDocument(id: LegalDocId): LegalDocumentMeta {
  const doc = LEGAL_DOCUMENTS.find((d) => d.id === id);
  if (!doc) {
    throw new Error(`Unknown legal document: ${id}`);
  }
  return doc;
}

export function getCombinedDisclosuresText(): string {
  return DISCLOSURE_DOC_IDS.map((id) => getLegalDocument(id).getText()).join("\n\n---\n\n");
}
