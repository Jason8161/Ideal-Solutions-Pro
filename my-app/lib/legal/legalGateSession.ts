import { loadLegalGateState, type LegalGateState } from "@/lib/legal/legalGate";
import { shouldSkipLegalGate } from "@/lib/legal/legalGatePolicy";
import { loadLegalIntroSeen } from "@/lib/legal/legalIntroStorage";

const LEGAL_HYDRATE_TIMEOUT_MS = 10_000;

let sessionComplete = false;
let finalizePromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

function notifyComplete(): void {
  listeners.forEach((listener) => listener());
}

/** Call when the launch legal gate is satisfied (accepted or skipped). */
export function markLegalGateSessionComplete(): void {
  if (sessionComplete) return;
  sessionComplete = true;
  notifyComplete();
}

/** Marks the legal gate session complete. SDKs must wait on {@link waitForLegalGateSessionComplete}. */
export async function finalizeLegalGateSession(): Promise<void> {
  if (sessionComplete) return;
  if (!finalizePromise) {
    finalizePromise = Promise.resolve().then(() => {
      markLegalGateSessionComplete();
    });
  }
  await finalizePromise;
}

/** Reads storage once; finalizes session when acceptance is current. */
export async function hydrateLegalGateSession(): Promise<boolean> {
  if (sessionComplete) return true;
  if (shouldSkipLegalGate()) {
    await finalizeLegalGateSession();
    return true;
  }
  const introSeen = await withTimeout(loadLegalIntroSeen(), LEGAL_HYDRATE_TIMEOUT_MS, true);
  const gate = await withTimeout<LegalGateState | null>(
    loadLegalGateState(introSeen),
    LEGAL_HYDRATE_TIMEOUT_MS,
    null,
  );
  if (!gate) return false;
  if (gate.step === null) {
    await finalizeLegalGateSession();
    return true;
  }
  return false;
}

/** Resolves after legal intro + seven documents are accepted and gate is skipped when allowed. */
export function waitForLegalGateSessionComplete(): Promise<void> {
  if (sessionComplete) return Promise.resolve();
  return new Promise((resolve) => {
    const onComplete = () => {
      listeners.delete(onComplete);
      resolve();
    };
    listeners.add(onComplete);
    void hydrateLegalGateSession().then((ready) => {
      if (ready) {
        listeners.delete(onComplete);
        resolve();
      }
    });
  });
}

/** React hook / gate helper ΓÇö fires immediately if session is already complete. */
export function subscribeLegalGateSessionComplete(onComplete: () => void): () => void {
  if (sessionComplete) {
    onComplete();
    return () => {};
  }
  listeners.add(onComplete);
  return () => {
    listeners.delete(onComplete);
  };
}

export function isLegalGateSessionComplete(): boolean {
  return sessionComplete;
}
