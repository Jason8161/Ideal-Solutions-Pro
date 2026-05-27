/** Combines multiple abort signals; aborts when any source aborts. */
export function mergeAbortSignals(...sources: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of sources) {
    if (!s) continue;
    if (s.aborted) {
      controller.abort();
      return controller.signal;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

export function withTimeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}

export function isAbortOrTimeoutError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "AbortError" || e.name === "TimeoutError") return true;
  const msg = e.message.toLowerCase();
  return msg.includes("aborted") || msg.includes("timeout") || msg.includes("timed out");
}
