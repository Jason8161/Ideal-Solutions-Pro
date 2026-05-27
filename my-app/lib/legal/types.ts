export type LegalDocId = "terms" | "servicesDescription" | "dataPrivacy" | "liability";

export type LegalAcceptanceRecord = {
  acceptedAt: string;
  version: string;
};

export type LegalAcceptances = {
  terms?: LegalAcceptanceRecord;
  servicesDescription?: LegalAcceptanceRecord;
  dataPrivacy?: LegalAcceptanceRecord;
  liability?: LegalAcceptanceRecord;
};

export type LegalFlowStep = "terms" | "disclosures" | null;
