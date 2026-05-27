import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";

import type { SupplierProvider } from "./contracts";
import { HttpBackendPricingProvider } from "./providers/HttpBackendPricingProvider";
import { NoopPricingProvider } from "./providers/NoopPricingProvider";

/**
 * Resolves the active pricing port: HTTP backend when configured, otherwise no-op (no bundled prices).
 */
export function getPricingProvider(): SupplierProvider {
  const url = getPricingApiBaseUrl();
  if (url) {
    console.log("[IdealSolutions][pricing] Backend base URL:", url);
    return new HttpBackendPricingProvider(url);
  }
  console.log("[IdealSolutions][pricing] No EXPO_PUBLIC_PRICING_API_URL — catalog disabled.");
  return new NoopPricingProvider();
}
