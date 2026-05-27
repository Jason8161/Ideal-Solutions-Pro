import type { BossInvoice } from "./types";

let draft: BossInvoice | null = null;

export function setInvoiceDraft(invoice: BossInvoice): void {
  draft = invoice;
}

export function peekInvoiceDraft(): BossInvoice | null {
  return draft;
}

export function takeInvoiceDraft(): BossInvoice | null {
  const current = draft;
  draft = null;
  return current;
}
