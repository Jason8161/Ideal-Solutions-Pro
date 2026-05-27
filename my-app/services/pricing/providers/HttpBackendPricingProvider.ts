import { humanizeCatalogSupplierError } from "@/lib/catalogSupplierErrors";
import type { PricingData, ProductWithPricing, SupplierProvider } from "../contracts";
import type { CatalogSearchParams, PricingSearchOutcome, SupplierSearchError } from "../searchCatalog";

const LOG = "[IdealSolutions][pricing]";

const SEARCH_PATH = "/api/pricing/v1/search";
const FETCH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 450;

type SearchResponseBody = {
  query?: string;
  length?: number;
  lengthUnit?: "ft" | "m";
  qty?: number;
  results?: ProductWithPricing[];
  errors?: SupplierSearchError[];
  warnings?: SupplierSearchError[];
  /** Legacy error field when old server returns 500 */
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPricingSearch(url: string): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    try {
      return await fetch(url, { cache: "no-store" });
    } catch (e) {
      lastErr = e;
      if (attempt < FETCH_ATTEMPTS - 1) {
        console.warn(`${LOG} search fetch failed, retrying`, e);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastErr;
}

function httpErrorHint(status: number, url: string): string {
  if (status === 404) {
    return `HTTP ${status} from pricing API. Check EXPO_PUBLIC_PRICING_API_URL is the server root (e.g. http://YOUR_IP:3001), not …/api/pricing. Request: ${url}`;
  }
  if (status === 401 || status === 403) {
    return `HTTP ${status} — pricing search is normally open; verify URL and any reverse proxy auth.`;
  }
  return `HTTP ${status}`;
}

/**
 * Remote catalog: calls `${baseUrl}/api/pricing/v1/search?q=...` on the pricing backend.
 */
export class HttpBackendPricingProvider implements SupplierProvider {
  readonly id = "http_backend";

  constructor(private readonly baseUrl: string) {}

  private normalizeBase(): string {
    return this.baseUrl.replace(/\/+$/, "");
  }

  async searchWithMeta(query: string, params?: CatalogSearchParams): Promise<PricingSearchOutcome> {
    const base = this.normalizeBase();
    const searchParams = new URLSearchParams({ q: query });
    if (params?.length !== undefined && params.length > 0) {
      searchParams.set("length", String(params.length));
      searchParams.set("unit", params.lengthUnit ?? "ft");
    }
    const qty = params?.qty ?? 1;
    if (qty > 1) {
      searchParams.set("qty", String(qty));
    }
    const vendorPresets = params?.vendorPresets?.filter((s) => typeof s === "string" && s.trim());
    if (vendorPresets && vendorPresets.length > 0) {
      searchParams.set("vendors", vendorPresets.map((s) => s.trim().toLowerCase()).join(","));
    }
    const u = `${base}${SEARCH_PATH}?${searchParams.toString()}`;
    console.log(`${LOG} GET`, u);

    let res: Response;
    try {
      res = await fetchPricingSearch(u);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`${LOG} network error`, msg, { url: u });
      return {
        query,
        results: [],
        errors: [{ supplier: "network", message: `Network error: ${msg}` }],
      };
    }

    const bodyText = await res.text();
    let body: SearchResponseBody = {};
    try {
      body = JSON.parse(bodyText) as SearchResponseBody;
    } catch {
      console.warn(`${LOG} invalid JSON`, { url: u, body: bodyText.slice(0, 500) });
      return {
        query,
        results: [],
        errors: [
          {
            supplier: "server",
            message: res.ok
              ? "Invalid JSON from pricing backend"
              : `${httpErrorHint(res.status, u)} — response was not JSON (check URL / proxy).`,
          },
        ],
      };
    }

    const results = (Array.isArray(body.results) ? body.results : []).map((row) => ({
      ...row,
      price: row.price === null || row.price === undefined ? "" : String(row.price),
    }));
    const errors: SupplierSearchError[] = (Array.isArray(body.errors) ? body.errors : []).map((e) => ({
      supplier: e.supplier,
      message: humanizeCatalogSupplierError(e.supplier, e.message),
    }));
    const warnings: SupplierSearchError[] = (Array.isArray(body.warnings) ? body.warnings : []).map((w) => ({
      supplier: w.supplier,
      message: humanizeCatalogSupplierError(w.supplier, w.message),
    }));

    if (!res.ok) {
      const legacy = body.error?.trim() || bodyText.slice(0, 200) || httpErrorHint(res.status, u);
      console.warn(`${LOG} HTTP ${res.status}`, { url: u, body: bodyText.slice(0, 2000) });
      return {
        query: body.query ?? query,
        results,
        warnings: warnings.length > 0 ? warnings : undefined,
        errors:
          errors.length > 0
            ? errors
            : [{ supplier: "server", message: `${legacy} (${httpErrorHint(res.status, u)})` }],
      };
    }

    if (errors.length > 0) {
      console.warn(`${LOG} partial catalog`, errors);
    }

    return {
      query: body.query ?? query,
      length: body.length,
      lengthUnit: body.lengthUnit,
      qty: body.qty,
      results,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async searchProducts(query: string): Promise<ProductWithPricing[]> {
    const { results } = await this.searchWithMeta(query);
    return results;
  }

  async getProductPrice(supplier: string, sku: string): Promise<PricingData | null> {
    const base = this.normalizeBase();
    const encS = encodeURIComponent(supplier);
    const encK = encodeURIComponent(sku);
    const u = `${base}/api/pricing/v1/products/${encS}/${encK}/price`;
    console.log(`${LOG} GET`, u);
    const res = await fetch(u, { cache: "no-store" });
    const bodyText = await res.text();
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`${LOG} HTTP ${res.status}`, { url: u, body: bodyText.slice(0, 2000) });
      throw new Error(`HTTP ${res.status}: ${bodyText.slice(0, 200)}`);
    }
    return JSON.parse(bodyText) as PricingData;
  }

  async updateCachedPrices(): Promise<{ rowsAffected: number }> {
    return { rowsAffected: 0 };
  }
}
