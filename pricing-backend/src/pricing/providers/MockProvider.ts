import type { PricingData, ProductWithPricing, SupplierProvider } from "../contracts";

/**
 * Development / empty-catalog fallback. Does not ship product prices in the mobile app.
 * Returns no rows unless another provider has populated the database.
 */
export class MockProvider implements SupplierProvider {
  readonly id = "mock";

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
