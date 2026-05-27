export function getAiOpenAiTimeoutMs(): number {
  const raw = process.env.AI_ASSISTANCE_TIMEOUT_MS?.trim();
  const n = raw ? Number(raw) : 55_000;
  return Number.isFinite(n) && n > 5_000 ? Math.min(n, 120_000) : 55_000;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...init, signal });
}

export function isFetchTimeoutError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return e.name === "TimeoutError" || e.name === "AbortError";
}
