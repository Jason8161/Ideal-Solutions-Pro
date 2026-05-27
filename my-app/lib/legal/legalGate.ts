import {
  isLegalStuffAcceptanceCurrent,
  loadLegalStuffAcceptance,
  type LegalStuffAcceptanceRecord,
} from "@/lib/legal/legalAcceptanceStorage";

export type LegalGateStep = "intro" | "agreement" | null;

export type LegalGateState = {
  record: LegalStuffAcceptanceRecord;
  step: LegalGateStep;
};

export function resolveLegalGateStep(
  record: LegalStuffAcceptanceRecord,
  introSeen: boolean,
): LegalGateStep {
  if (isLegalStuffAcceptanceCurrent(record)) {
    return null;
  }
  if (!introSeen) {
    return "intro";
  }
  return "agreement";
}

export async function loadLegalGateState(introSeen: boolean): Promise<LegalGateState> {
  const record = await loadLegalStuffAcceptance();
  return {
    record,
    step: resolveLegalGateStep(record, introSeen),
  };
}

export function isLegalGateComplete(record: LegalStuffAcceptanceRecord): boolean {
  return isLegalStuffAcceptanceCurrent(record);
}
