import { humanizeCatalogSupplierError } from "@/lib/catalogSupplierErrors";
import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";
import type { ProductWithPricing } from "@/services/pricing";
import type { PricingSearchOutcome, SupplierSearchError } from "@/services/pricing/searchCatalog";

const LOG = "[MaterialsPricingSearch]";

const FETCH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type SearchBody = {
  query?: string;
  results?: ProductWithPricing[];
  errors?: SupplierSearchError[];
  warnings?: SupplierSearchError[];
  length?: number;
  lengthUnit?: "ft" | "m";
  qty?: number;
};

function buildSearchParams(
  query: string,
  opts: { length?: number; lengthUnit?: "ft" | "m"; qty?: number },
): URLSearchParams {
  const p = new URLSearchParams({ q: query });
  if (opts.length !== undefined && opts.length > 0) {
    p.set("length", String(opts.length));
    p.set("unit", opts.lengthUnit ?? "ft");
  }
  if ((opts.qty ?? 1) > 1) {
    p.set("qty", String(opts.qty ?? 1));
  }
  return p;
}

async function fetchJsonOnce(url: string, signal?: AbortSignal): Promise<Response> {
  let last: unknown;
  for (let a = 0; a < FETCH_ATTEMPTS; a++) {
    try {
      return await fetch(url, { cache: "no-store", signal });
    } catch (e) {
      last = e;
      if (a < FETCH_ATTEMPTS - 1) {
        console.warn(`${LOG} fetch retry`, { url, attempt: a + 1, error: e });
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw last;
}

function parseOutcome(query: string, res: Response, bodyText: string): PricingSearchOutcome {
  let body: SearchBody = {};
  try {
    body = JSON.parse(bodyText) as SearchBody;
  } catch {
    return {
      query,
      results: [],
      errors: [
        {
          supplier: "server",
          message: res.ok ? "Invalid JSON from pricing server" : `HTTP ${res.status} (non-JSON body)`,
        },
      ],
    };
  }
  const results = (Array.isArray(body.results) ? body.results : []).map((row) => ({
    ...row,
    price: row.price === null || row.price === undefined ? "" : String(row.price),
    pricingSource: row.pricingSource ?? ("estimate" as const),
  }));
  const errors: SupplierSearchError[] = (Array.isArray(body.errors) ? body.errors : []).map((e) => ({
    supplier: e.supplier,
    message: humanizeCatalogSupplierError(e.supplier, e.message),
  }));
  const warnings: SupplierSearchError[] | undefined = Array.isArray(body.warnings)
    ? body.warnings.map((w) => ({
        supplier: w.supplier,
        message: humanizeCatalogSupplierError(w.supplier, w.message),
      }))
    : undefined;
  return {
    query: body.query ?? query,
    length: body.length,
    lengthUnit: body.lengthUnit,
    qty: body.qty,
    results,
    errors,
    warnings,
  };
}

/** Fast catalog + CSV (+ City Electric) — no live Unwrangle. */
export async function fetchPricingEstimates(
  query: string,
  opts: { length?: number; lengthUnit?: "ft" | "m"; qty?: number },
  signal?: AbortSignal,
): Promise<PricingSearchOutcome> {
  const base = getPricingApiBaseUrl().replace(/\/+$/, "");
  const qs = buildSearchParams(query, opts).toString();
  const url = `${base}/api/pricing/v1/search/estimates?${qs}`;
  console.log(`${LOG} estimates request start`, url);
  try {
    const res = await fetchJsonOnce(url, signal);
    const text = await res.text();
    if (!res.ok) {
      console.warn(`${LOG} estimates API error`, { status: res.status, url });
    }
    const out = parseOutcome(query, res, text);
    console.log(`${LOG} estimates response`, {
      ok: res.ok,
      status: res.status,
      rows: out.results.length,
      errors: out.errors.length,
    });
    return out;
  } catch (e) {
    const isAbort = e instanceof Error && e.name === "AbortError";
    console.warn(`${LOG} estimates ${isAbort ? "timeout/abort" : "error"}`, e);
    return {
      query,
      results: [],
      errors: [
        {
          supplier: isAbort ? "timeout" : "network",
          message: e instanceof Error ? e.message : String(e),
        },
      ],
    };
  }
}

/** One supply-house card: catalog (+ optional live APIs for that preset). */
export async function fetchVendorPresetSearch(
  preset: string,
  query: string,
  opts: { length?: number; lengthUnit?: "ft" | "m"; qty?: number },
  signal?: AbortSignal,
): Promise<PricingSearchOutcome> {
  const base = getPricingApiBaseUrl().replace(/\/+$/, "");
  const enc = encodeURIComponent(preset.trim().toLowerCase());
  const qs = buildSearchParams(query, opts).toString();
  const url = `${base}/api/pricing/v1/vendor/${enc}/search?${qs}`;
  console.log(`${LOG} vendor="${preset}" request start`, url);
  try {
    const res = await fetchJsonOnce(url, signal);
    const text = await res.text();
    if (!res.ok) {
      console.warn(`${LOG} vendor="${preset}" API error`, { status: res.status, url });
    }
    const out = parseOutcome(query, res, text);
    console.log(`${LOG} vendor="${preset}" response`, {
      ok: res.ok,
      status: res.status,
      rows: out.results.length,
      errors: out.errors.map((x) => `${x.supplier}: ${x.message}`).slice(0, 3),
    });
    return out;
  } catch (e) {
    const isAbort = e instanceof Error && e.name === "AbortError";
    console.warn(`${LOG} vendor="${preset}" ${isAbort ? "timeout/abort" : "error"}`, e);
    return {
      query,
      results: [],
      errors: [
        {
          supplier: isAbort ? "timeout" : "network",
          message: e instanceof Error ? e.message : String(e),
        },
      ],
    };
  }
}

export function withTimeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const c = new AbortController();
  const t = setTimeout(() => {
    console.warn(`${LOG} abort after ${ms}ms`);
    c.abort();
  }, ms);
  return {
    signal: c.signal,
    cancel: () => clearTimeout(t),
  };
}
