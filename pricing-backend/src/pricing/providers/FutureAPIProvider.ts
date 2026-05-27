import type { PricingData, ProductWithPricing, SupplierProvider } from "../contracts";

/**
 * Placeholder for Rexel, Graybar, City Electric, Lowe’s, Home Depot, EDI, PunchOut, cXML, etc.
 * Wire HTTP clients + legal agreements here without changing the orchestrator contract.
 */
export class FutureAPIProvider implements SupplierProvider {
  readonly id = "future_api";

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
