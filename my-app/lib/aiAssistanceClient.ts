import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";
import { isAbortOrTimeoutError, mergeAbortSignals, withTimeoutSignal } from "@/lib/fetchTimeout";
import type {
  AiAssistanceRequest,
  AiAssistanceResponse,
  AiChatMessage,
  AiAssistanceUserContext,
} from "@/lib/aiAssistanceTypes";

/** Must exceed typical mobile network limits; server OpenAI call should finish first (~55s). */
export const AI_ASSISTANCE_CLIENT_TIMEOUT_MS = 70_000;

export type SendAiAssistanceResult =
  | { ok: true; reply: string }
  | { ok: false; message: string };

/**
 * Calls POST {pricingApiBase}/api/ai-assistance (OpenAI key stays on the server).
 */
export async function sendAiAssistanceMessage(
  message: string,
  chatHistory: readonly AiChatMessage[],
  userContext?: AiAssistanceUserContext,
  signal?: AbortSignal,
): Promise<SendAiAssistanceResult> {
  const base = getPricingApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      message:
        "AI server not configured. Set EXPO_PUBLIC_PRICING_API_URL in my-app/.env to your pricing-backend URL (e.g. http://192.168.x.x:3001), restart Expo, and ensure OPENAI_API_KEY is set on the server.",
    };
  }

  const trimmedHistory = chatHistory.length > 20 ? chatHistory.slice(-20) : chatHistory;

  const body: AiAssistanceRequest = {
    message: message.trim(),
    chatHistory: [...trimmedHistory],
    ...(userContext && Object.keys(userContext).length > 0 ? { userContext } : {}),
  };

  const url = `${base.replace(/\/+$/, "")}/api/ai-assistance`;
  const timeout = withTimeoutSignal(AI_ASSISTANCE_CLIENT_TIMEOUT_MS);
  const mergedSignal = mergeAbortSignals(signal, timeout.signal);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: mergedSignal,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return {
        ok: false,
        message: res.ok ? "Invalid response from AI server." : `AI request failed (${res.status}).`,
      };
    }

    if (!res.ok) {
      const err =
        json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
          ? (json as { error: string }).error
          : res.status === 504
            ? "The AI request timed out on the server. Try a shorter question."
            : `AI request failed (${res.status}).`;
      return { ok: false, message: err };
    }

    const reply =
      json && typeof json === "object" && "reply" in json && typeof (json as AiAssistanceResponse).reply === "string"
        ? (json as AiAssistanceResponse).reply.trim()
        : "";

    if (!reply) {
      return { ok: false, message: "AI returned an empty reply." };
    }

    return { ok: true, reply };
  } catch (e) {
    if (mergedSignal.aborted && !signal?.aborted) {
      return {
        ok: false,
        message:
          "Request timed out. Make sure pricing-backend is running, OPENAI_API_KEY is set, and your phone can reach your PC on the LAN. Try a shorter question.",
      };
    }
    if (signal?.aborted) {
      return { ok: false, message: "Request cancelled." };
    }
    if (isAbortOrTimeoutError(e)) {
      return {
        ok: false,
        message:
          "Network timed out. Confirm EXPO_PUBLIC_PRICING_API_URL points to your PC (not localhost on a phone), pricing-backend is running, and api.openai.com is reachable from the server.",
      };
    }
    const msg = e instanceof Error ? e.message : "Network error";
    return {
      ok: false,
      message: `${msg}. Check that pricing-backend is running and reachable from this device.`,
    };
  } finally {
    timeout.cancel();
  }
}
