import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";
import type { ProductWithPricing } from "./contracts";
import { HttpBackendPricingProvider } from "./providers/HttpBackendPricingProvider";

export type SupplierSearchError = {
  supplier: string;
  message: string;
};

export type CatalogSearchParams = {
  length?: number;
  lengthUnit?: "ft" | "m";
  qty?: number;
  /** Preset ids from Settings → My supply houses; limits live Unwrangle calls on the pricing server. */
  vendorPresets?: readonly string[];
};

export type PricingSearchOutcome = {
  query: string;
  length?: number;
  lengthUnit?: "ft" | "m";
  qty?: number;
  results: ProductWithPricing[];
  errors: SupplierSearchError[];
  /** Optional hints from the server (missing optional CSV, HD store config, etc.). */
  warnings?: SupplierSearchError[];
};

/** Search the pricing backend; never throws for HTTP 200 with supplier errors. */
export async function searchCatalog(
  query: string,
  params?: CatalogSearchParams,
): Promise<PricingSearchOutcome> {
  const base = getPricingApiBaseUrl();
  if (!base) {
    return {
      query,
      results: [],
      errors: [{ supplier: "config", message: "Pricing server not configured (EXPO_PUBLIC_PRICING_API_URL)." }],
    };
  }
  return new HttpBackendPricingProvider(base).searchWithMeta(query, params);
}
