import Constants from "expo-constants";

function readExtra(): { skipLegalGate?: boolean } {
  return (Constants.expoConfig?.extra ?? {}) as { skipLegalGate?: boolean };
}

/**
 * When true (EXPO_PUBLIC_SKIP_LEGAL_GATE=true at build/Metro time), the launch disclaimer modal is skipped.
 * Settings ΓåÆ Legal Stuff remains available for read-only viewing.
 * Default is false ΓÇö gate runs in dev and production unless explicitly opted out.
 */
export function shouldSkipLegalGate(): boolean {
  if (readExtra().skipLegalGate === true) return true;
  return process.env.EXPO_PUBLIC_SKIP_LEGAL_GATE === "true";
}
