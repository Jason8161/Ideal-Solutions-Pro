import type { PersonalTabRecord, PersonalTabStatesMap, PersonalTabStatus } from "./types";

export function personalTabStateKey(phase: string): string {
  return phase.trim().toLowerCase();
}

export function normalizePersonalTabRecord(
  value: PersonalTabRecord | PersonalTabStatus | undefined,
): PersonalTabRecord {
  if (value == null) return { status: "pending" };
  if (typeof value === "string") return { status: value };
  return {
    status: value.status,
    needsInvoice: value.needsInvoice,
    invoicePercent: value.invoicePercent,
  };
}

export function getPersonalTabRecord(
  states: PersonalTabStatesMap | undefined,
  phase: string,
): PersonalTabRecord {
  if (!states) return { status: "pending" };
  return normalizePersonalTabRecord(states[personalTabStateKey(phase)]);
}

export function getPersonalTabStatus(
  states: PersonalTabStatesMap | undefined,
  phase: string,
): PersonalTabStatus {
  return getPersonalTabRecord(states, phase).status;
}

export function getPersonalTabNeedsInvoice(
  states: PersonalTabStatesMap | undefined,
  phase: string,
): boolean {
  return Boolean(getPersonalTabRecord(states, phase).needsInvoice);
}

export function getPersonalTabInvoicePercent(
  states: PersonalTabStatesMap | undefined,
  phase: string,
): number | undefined {
  const pct = getPersonalTabRecord(states, phase).invoicePercent;
  return pct != null && pct > 0 && pct <= 100 ? pct : undefined;
}

export function setPersonalTabInvoicePercent(
  states: PersonalTabStatesMap | undefined,
  phase: string,
  invoicePercent: number | undefined,
): PersonalTabStatesMap {
  const key = personalTabStateKey(phase);
  const prev = normalizePersonalTabRecord(states?.[key]);
  const pct =
    invoicePercent != null && invoicePercent > 0 && invoicePercent <= 100
      ? invoicePercent
      : undefined;
  return { ...(states ?? {}), [key]: { ...prev, invoicePercent: pct } };
}

export function setPersonalTabStatus(
  states: PersonalTabStatesMap | undefined,
  phase: string,
  status: PersonalTabStatus,
): PersonalTabStatesMap {
  const key = personalTabStateKey(phase);
  const prev = normalizePersonalTabRecord(states?.[key]);
  return { ...(states ?? {}), [key]: { ...prev, status } };
}

export function setPersonalTabNeedsInvoice(
  states: PersonalTabStatesMap | undefined,
  phase: string,
  needsInvoice: boolean,
): PersonalTabStatesMap {
  const key = personalTabStateKey(phase);
  const prev = normalizePersonalTabRecord(states?.[key]);
  return {
    ...(states ?? {}),
    [key]: {
      ...prev,
      needsInvoice: needsInvoice || undefined,
    },
  };
}
