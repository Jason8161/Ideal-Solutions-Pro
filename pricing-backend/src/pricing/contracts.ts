/** Shared domain types for the pricing engine (backend source of truth). */

export type Product = {
  id: string;
  supplier: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
};

export type PricingData = {
  productId: string;
  supplier: string;
  price: string;
  unit: string;
  availability: string;
  lastUpdated: string;
};

/** Optional retail API fields (Home Depot live search, future store APIs). */
export type RetailProductFields = {
  brand?: string;
  listPrice?: string;
  pricePerUnit?: string;
  unitOfMeasure?: string;
  productId?: string;
  modelNo?: string;
  upc?: string;
  url?: string;
  image?: string;
  inStock?: boolean | null;
  inventoryQuantity?: number | null;
  storeId?: string;
  department?: string;
  rating?: number | null;
  totalReviews?: number | null;
};

export type ProductWithPricing = Product &
  RetailProductFields & {
    price: string;
    unit: string;
    availability: string;
    lastUpdated: string;
    /** Live retailer API vs local catalog/CSV estimate. */
    pricingSource?: "live" | "estimate";
  };

/**
 * Pluggable supplier / catalog source. Implementations live under `providers/`.
 * Official APIs (Rexel, Graybar, Lowe’s, Home Depot, EDI, PunchOut, cXML) map to new classes later.
 */
export interface SupplierProvider {
  readonly id: string;

  searchProducts(query: string): Promise<ProductWithPricing[]>;

  getProductPrice(supplier: string, sku: string): Promise<PricingData | null>;

  /** Called by scheduled jobs to refresh local cache (DB, files, etc.). */
  updateCachedPrices(): Promise<{ rowsAffected: number }>;
}
