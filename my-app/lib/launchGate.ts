import { useEffect, useState } from "react";

/** Max time auth/trial gates show a blocking launch spinner before rendering the app shell. */
export const LAUNCH_GATE_MAX_WAIT_MS = 5_000;

/**
 * True after {@link LAUNCH_GATE_MAX_WAIT_MS} so launch gates never block interaction indefinitely.
 */
export function useLaunchGateBypass(): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), LAUNCH_GATE_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  return timedOut;
}
