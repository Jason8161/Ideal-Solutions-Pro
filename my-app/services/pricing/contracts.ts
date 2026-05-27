/** Client-side mirror of the backend pricing contracts (no bundled prices). */

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

/** Optional retail API fields from pricing-backend live search (e.g. Home Depot). */
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

export interface SupplierProvider {
  readonly id: string;
  searchProducts(query: string): Promise<ProductWithPricing[]>;
  getProductPrice(supplier: string, sku: string): Promise<PricingData | null>;
  updateCachedPrices(): Promise<{ rowsAffected: number }>;
}
