import type { PricingData, ProductWithPricing, SupplierProvider } from "../contracts";

/** Used when no pricing API URL is configured — returns empty results (no hard-coded catalog). */
export class NoopPricingProvider implements SupplierProvider {
  readonly id = "noop";

  async searchProducts(_query: string): Promise<ProductWithPricing[]> {
    return [];
  }

  async getProductPrice(_supplier: string, _sku: string): Promise<PricingData | null> {
    return null;
  }

  async updateCachedPrices(): Promise<{ rowsAffected: number }> {
    return { rowsAffected: 0 };
  }
}
