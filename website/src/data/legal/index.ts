import { accountDataDeletion } from "./accountDataDeletion";
import { aiDisclaimer } from "./aiDisclaimer";
import { employeeGpsConsent } from "./employeeGpsConsent";
import { eula } from "./eula";
import { privacyPolicy } from "./privacyPolicy";
import { termsOfService } from "./termsOfService";
import type { LegalDocument } from "./types";

export type { LegalDocument } from "./types";

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  privacyPolicy,
  termsOfService,
  aiDisclaimer,
  employeeGpsConsent,
  accountDataDeletion,
  eula,
] as const;

export function getLegalDocumentBySlug(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}

export function legalDocumentPath(slug: string): string {
  return `/legal/${slug}`;
}
