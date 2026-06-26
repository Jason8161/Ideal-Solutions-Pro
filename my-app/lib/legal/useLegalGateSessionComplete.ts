import { useEffect, useState } from "react";

import {
  finalizeLegalGateSession,
  hydrateLegalGateSession,
  subscribeLegalGateSessionComplete,
} from "@/lib/legal/legalGateSession";
import { shouldSkipLegalGate } from "@/lib/legal/legalGatePolicy";

/**
 * True once launch legal intro + agreements are accepted (or the gate is skipped).
 * Auth and trial gates should defer redirects until this is true.
 */
export function useLegalGateSessionComplete(): boolean {
  const skipGate = shouldSkipLegalGate();
  const [complete, setComplete] = useState(skipGate);

  useEffect(() => {
    if (skipGate) {
      void finalizeLegalGateSession().then(() => {
        if (!cancelled) setComplete(true);
      });
      return;
    }

    let cancelled = false;

    void hydrateLegalGateSession().then((ready) => {
      if (!cancelled && ready) setComplete(true);
    });

    const unsubscribe = subscribeLegalGateSessionComplete(() => {
      if (!cancelled) setComplete(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [skipGate]);

  return skipGate || complete;
}
