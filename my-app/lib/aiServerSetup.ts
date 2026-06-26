import Constants, { ExecutionEnvironment } from "expo-constants";

import { getRuntimeTestFlightDetected } from "@/lib/betaAccess";
import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";

/** True when the app knows where pricing-backend lives (local .env, app.config extra, or dev inference). */
export function isAiServerConfigured(): boolean {
  return Boolean(getPricingApiBaseUrl());
}

/** Native/store build where Metro dev inference does not run (__DEV__ is false). */
function isReleaseNativeBuild(): boolean {
  if (__DEV__) return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

/**
 * Shown when EXPO_PUBLIC_PRICING_API_URL is missing from the build and dev inference failed.
 * AI calls POST {base}/api/ai-assistance ΓÇö OpenAI key stays on pricing-backend only.
 */
export function aiServerNotConfiguredMessage(): string {
  if (isReleaseNativeBuild()) {
    const testFlight = getRuntimeTestFlightDetected();
    const lines = [
      testFlight
        ? "This TestFlight build was compiled without an AI server URL."
        : "This app build was compiled without an AI server URL.",
      "",
      "EAS cloud builds do not use my-app/.env. On your PC, set EXPO_PUBLIC_PRICING_API_URL in Expo (EAS env), then rebuild and reinstall TestFlight:",
      "",
      "  cd my-app",
      "  npx eas env:create --name EXPO_PUBLIC_PRICING_API_URL --value \"https://YOUR_PUBLIC_API\" --environment preview --visibility plaintext",
      "  npm run eas:build:preview:ios",
      "",
      "Use a public HTTPS URL (deployed pricing-backend). A home WiΓÇæFi IP only works on the same network as your PC.",
      "",
      "Quick test without deploy: run pricing-backend locally, expose port 3001 with ngrok, paste the https://ΓÇª.ngrok URL into eas env:create above, rebuild.",
      "",
      "OPENAI_API_KEY belongs in pricing-backend/.env on the server ΓÇö never in the mobile app.",
    ];
    return lines.join("\n");
  }

  return [
    "AI server URL is not configured in this app build.",
    "",
    "Local development (PowerShell):",
    "1. In pricing-backend: copy .env.example to .env, set OPENAI_API_KEY=sk-ΓÇª, then npm run dev",
    "2. In my-app/.env: EXPO_PUBLIC_PRICING_API_URL=http://YOUR_LAN_IP:3001",
    "   (run ipconfig ΓåÆ IPv4; not localhost on a physical phone)",
    "3. Restart Expo: npx expo start -c --host lan",
    "",
    "EAS / TestFlight / Play builds:",
    "Set EXPO_PUBLIC_PRICING_API_URL to your public pricing-backend HTTPS URL",
    "(npx eas env:create or eas.json env), then rebuild. OPENAI_API_KEY belongs in pricing-backend/.env on the server ΓÇö never in the mobile app.",
  ].join("\n");
}

/** Map pricing-backend /api/ai-assistance error JSON to user-facing text. */
export function formatAiServerError(status: number, serverError?: string): string {
  const err = serverError?.trim();
  if (status === 503 && err) {
    return err;
  }
  if (status === 503) {
    return [
      "AI is not configured on pricing-backend.",
      "Set OPENAI_API_KEY in pricing-backend/.env and restart the server (npm run dev).",
    ].join(" ");
  }
  if (status === 504) {
    return err ?? "The AI request timed out on the server. Try a shorter question.";
  }
  if (status === 402 && err) {
    return err;
  }
  if (err) {
    return err;
  }
  return `AI request failed (HTTP ${status}). Check that pricing-backend is running and reachable.`;
}

export function aiNetworkErrorMessage(detail?: string): string {
  const prefix = detail?.trim() ? `${detail.trim()}. ` : "";
  return (
    prefix +
    "Check that pricing-backend is running (npm run dev), EXPO_PUBLIC_PRICING_API_URL points to your PC's LAN IP (not localhost on a phone), and Windows Firewall allows port 3001."
  );
}
