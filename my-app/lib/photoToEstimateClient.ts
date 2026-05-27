import type {
  PhotoEstimateAiResult,
  PhotoEstimateRequest,
  PhotoEstimateResponse,
} from "@/lib/photoToEstimateTypes";
import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";
import { isAbortOrTimeoutError, mergeAbortSignals, withTimeoutSignal } from "@/lib/fetchTimeout";

export const PHOTO_ESTIMATE_CLIENT_TIMEOUT_MS = 90_000;

export type RequestPhotoEstimateResult =
  | { ok: true; estimate: PhotoEstimateAiResult }
  | { ok: false; message: string };

function isConfidence(value: unknown): value is PhotoEstimateAiResult["confidence"] {
  return value === "low" || value === "medium" || value === "high";
}

function parseEstimate(raw: unknown): PhotoEstimateAiResult | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const lineItemsRaw = Array.isArray(row.lineItems) ? row.lineItems : [];
  const lineItems = lineItemsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const line = item as Record<string, unknown>;
      const description = typeof line.description === "string" ? line.description.trim() : "";
      const amount = typeof line.amount === "number" ? line.amount : Number(line.amount);
      if (!description || !Number.isFinite(amount) || amount <= 0) return null;
      return { description, amount };
    })
    .filter((x): x is { description: string; amount: number } => x !== null);

  const num = (key: string) => {
    const v = row[key];
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };

  const assumptionsRaw = Array.isArray(row.assumptions) ? row.assumptions : [];
  const assumptions = assumptionsRaw
    .map((a) => (typeof a === "string" ? a.trim() : ""))
    .filter(Boolean);

  const jobName = typeof row.jobName === "string" ? row.jobName.trim() : "";
  const scope = typeof row.scope === "string" ? row.scope.trim() : "";
  if (!jobName && !scope && lineItems.length === 0) return null;

  return {
    jobName: jobName || "Photo estimate",
    customerName: typeof row.customerName === "string" ? row.customerName.trim() : "",
    scope,
    laborAmount: num("laborAmount"),
    materialAmount: num("materialAmount"),
    permitAmount: num("permitAmount"),
    miscAmount: num("miscAmount"),
    markupPercent: num("markupPercent"),
    taxPercent: num("taxPercent"),
    lineItems,
    notes: typeof row.notes === "string" ? row.notes.trim() : "",
    assumptions,
    confidence: isConfidence(row.confidence) ? row.confidence : "medium",
  };
}

export async function requestPhotoEstimate(
  body: PhotoEstimateRequest,
  signal?: AbortSignal,
): Promise<RequestPhotoEstimateResult> {
  const base = getPricingApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      message:
        "AI server not configured. Set EXPO_PUBLIC_PRICING_API_URL in my-app/.env to your pricing-backend URL and ensure OPENAI_API_KEY is set on the server.",
    };
  }

  if (!body.images.length) {
    return { ok: false, message: "Add at least one photo to analyze." };
  }

  const url = `${base.replace(/\/+$/, "")}/api/ai-estimate-from-photo`;
  const timeout = withTimeoutSignal(PHOTO_ESTIMATE_CLIENT_TIMEOUT_MS);
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
        message: res.ok ? "Invalid response from AI server." : `Photo estimate failed (${res.status}).`,
      };
    }

    if (!res.ok) {
      const err =
        json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
          ? (json as { error: string }).error
          : res.status === 504
            ? "Photo analysis timed out. Try fewer or smaller images."
            : `Photo estimate failed (${res.status}).`;
      return { ok: false, message: err };
    }

    const estimateRaw =
      json && typeof json === "object" && "estimate" in json
        ? (json as PhotoEstimateResponse).estimate
        : json;

    const estimate = parseEstimate(estimateRaw);
    if (!estimate) {
      return { ok: false, message: "AI returned an estimate we could not read. Try again or edit manually." };
    }

    return { ok: true, estimate };
  } catch (e) {
    if (mergedSignal.aborted && !signal?.aborted) {
      return { ok: false, message: "Photo analysis timed out. Try fewer photos or a shorter note." };
    }
    if (signal?.aborted) {
      return { ok: false, message: "Request cancelled." };
    }
    if (isAbortOrTimeoutError(e)) {
      return {
        ok: false,
        message:
          "Network timed out. Confirm pricing-backend is running and your phone can reach it on the LAN.",
      };
    }
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, message: `${msg}. Check pricing-backend is reachable from this device.` };
  } finally {
    timeout.cancel();
  }
}
