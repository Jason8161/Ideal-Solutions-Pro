import type { ProductWithPricing, SupplierProvider } from "../contracts";

type UnwrangleSearchRow = {
  name?: string;
  id?: string;
  item_number?: string;
  model_no?: string;
  url?: string;
  price?: number;
  price_reduced?: number;
  list_price?: number;
  in_stock?: boolean;
  brand?: string;
};

type UnwrangleSearchResponse = {
  success?: boolean;
  results?: UnwrangleSearchRow[];
};

/**
 * Live Lowe's search via Unwrangle (third-party, not Lowe's official API).
 * Requires UNWRANGLE_API_KEY from https://console.unwrangle.com/
 * Sign up is separate from Lowe's — Lowe's B2B catalog is partner-only (SFTP / portal invite).
 */
export class LowesUnwrangleProvider implements SupplierProvider {
  readonly id = "lowes_unwrangle";

  constructor(private readonly apiKey: string) {}

  async searchProducts(query: string): Promise<ProductWithPricing[]> {
    const q = query.trim();
    if (!q || !this.apiKey) return [];

    const params = new URLSearchParams({
      platform: "lowes_search",
      search: q.replace(/\s+/g, "+"),
      api_key: this.apiKey,
    });

    const url = `https://data.unwrangle.com/api/getter/?${params.toString()}`;
    const res = await fetch(url);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`Lowe's live search failed (HTTP ${res.status}): ${bodyText.slice(0, 200)}`);
    }

    let body: UnwrangleSearchResponse;
    try {
      body = JSON.parse(bodyText) as UnwrangleSearchResponse;
    } catch {
      throw new Error("Lowe's live search returned invalid JSON");
    }

    if (!body.success || !Array.isArray(body.results)) return [];

    return body.results.slice(0, 24).map((r, i) => {
      const priceNum = r.price_reduced ?? r.price ?? r.list_price;
      const price = priceNum !== undefined && priceNum !== null ? String(priceNum) : "";
      const sku = r.item_number ?? r.model_no ?? r.id ?? `lowes-${i}`;
      return {
        id: `lowes-live-${sku}`,
        supplier: "lowes",
        sku,
        name: r.name ?? "Lowe's product",
        description: r.brand ? `Brand: ${r.brand}` : "",
        imageUrl: "",
        category: "",
        price,
        unit: "",
        availability: r.in_stock === false ? "Out of stock" : r.in_stock === true ? "In stock" : "",
        lastUpdated: new Date().toISOString(),
        pricingSource: "live",
      };
    });
  }

  async getProductPrice(): Promise<null> {
    return null;
  }

  async updateCachedPrices(): Promise<{ rowsAffected: number }> {
    return { rowsAffected: 0 };
  }
}
