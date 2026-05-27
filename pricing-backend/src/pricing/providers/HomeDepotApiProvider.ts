import type { ProductWithPricing, SupplierProvider } from "../contracts";
import { filterAndRankElectricalResults } from "../electricalRelevance";

type HdFulfillmentOption = {
  fulfillment_type?: string;
  store_id?: string;
  inventory?: { quantity?: number; in_stock?: boolean };
};

type HdSearchRow = {
  name?: string;
  brand?: string;
  id?: string;
  url?: string;
  model_no?: string;
  upc?: string;
  thumbnails?: string[];
  images?: { url?: string; type?: string }[];
  rating?: number;
  total_reviews?: number;
  price?: number;
  list_price?: number;
  price_per_unit?: number | null;
  unit_of_measure?: string;
  categories?: string[];
  department?: string;
  availability?: string;
  in_stock?: boolean;
  fulfillment_options?: HdFulfillmentOption[];
};

type HdSearchResponse = {
  success?: boolean;
  results?: HdSearchRow[];
  store_no?: string;
  error?: string;
  message?: string;
  detail?: string;
};

function homedepotApiFailureMessage(body: HdSearchResponse, bodyText: string): string {
  const fromBody =
    body.error?.trim() ||
    body.message?.trim() ||
    (typeof body.detail === "string" ? body.detail.trim() : "");
  if (fromBody) return fromBody;
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    for (const key of ["error", "message", "detail", "reason"]) {
      const v = parsed[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  } catch {
    /* use fallback */
  }
  return "Home Depot live search returned success=false (check HOMEDEPOT_API_KEY / UNWRANGLE_API_KEY and store_no + zipcode)";
}

export type HomeDepotApiConfig = {
  apiKey: string;
  storeNo?: string;
  zipcode?: string;
  baseUrl?: string;
};

const DEFAULT_BASE = "https://data.unwrangle.com/api/getter/";

function formatMoney(value: number | null | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return String(value);
}

function pickImage(row: HdSearchRow): string {
  const primary = row.images?.find((i) => i.type === "PRIMARY")?.url;
  if (primary) return primary;
  if (row.thumbnails?.[0]) return row.thumbnails[0];
  return row.images?.[0]?.url ?? "";
}

function pickCategory(row: HdSearchRow): string {
  if (Array.isArray(row.categories) && row.categories.length > 0) {
    return row.categories[row.categories.length - 1] ?? "";
  }
  return row.department ?? "";
}

function pickInventory(row: HdSearchRow, preferredStoreId?: string): { storeId: string; qty: number | null } {
  const options = row.fulfillment_options ?? [];
  if (options.length === 0) return { storeId: preferredStoreId ?? "", qty: null };

  const matchStore =
    (preferredStoreId &&
      options.find((o) => o.store_id === preferredStoreId && o.inventory?.quantity != null)) ||
    options.find((o) => o.fulfillment_type === "pickup" && o.inventory?.quantity != null) ||
    options.find((o) => o.inventory?.quantity != null) ||
    options[0];

  return {
    storeId: matchStore?.store_id ?? preferredStoreId ?? "",
    qty: matchStore?.inventory?.quantity ?? null,
  };
}

/**
 * Live Home Depot search via Unwrangle THD API (third-party, not Home Depot official).
 * Requires HOMEDEPOT_API_KEY or UNWRANGLE_API_KEY in pricing-backend/.env only.
 */
export class HomeDepotApiProvider implements SupplierProvider {
  readonly id = "homedepot_api";

  constructor(private readonly config: HomeDepotApiConfig) {}

  async searchProducts(query: string): Promise<ProductWithPricing[]> {
    const q = query.trim();
    if (!q || !this.config.apiKey) return [];

    const params = new URLSearchParams({
      platform: "homedepot_search",
      search: q.replace(/\s+/g, "+"),
      api_key: this.config.apiKey,
    });

    if (this.config.storeNo?.trim()) params.set("store_no", this.config.storeNo.trim());
    if (this.config.zipcode?.trim()) params.set("zipcode", this.config.zipcode.trim());

    const base = (this.config.baseUrl ?? DEFAULT_BASE).replace(/\/?$/, "/");
    const url = `${base}?${params.toString()}`;

    const res = await fetch(url);
    const bodyText = await res.text();
    if (!res.ok) {
      throw new Error(`Home Depot live search failed (HTTP ${res.status}): ${bodyText.slice(0, 200)}`);
    }

    let body: HdSearchResponse;
    try {
      body = JSON.parse(bodyText) as HdSearchResponse;
    } catch {
      throw new Error("Home Depot live search returned invalid JSON");
    }

    if (!body.success) {
      throw new Error(homedepotApiFailureMessage(body, bodyText));
    }
    if (!Array.isArray(body.results)) {
      throw new Error("Home Depot live search response missing results array");
    }
    if (body.results.length === 0) return [];

    const storeNo = this.config.storeNo?.trim() || body.store_no?.trim() || "";

    const ranked = filterAndRankElectricalResults(
      q,
      body.results.map((r) => ({
        raw: r,
        name: r.name ?? "",
        brand: r.brand,
        category: pickCategory(r),
        department: r.department,
        description: [r.brand, r.department, ...(r.categories ?? [])].filter(Boolean).join(" "),
      })),
      { maxResults: 24 },
    );

    return ranked.map(({ raw: r }, i) => {
      const productId = r.id ?? r.model_no ?? `hd-${i}`;
      const { storeId, qty } = pickInventory(r, storeNo);
      const image = pickImage(r);
      const category = pickCategory(r);
      const price = formatMoney(r.price);
      const listPrice = formatMoney(r.list_price);
      const pricePerUnit =
        r.price_per_unit != null && r.price_per_unit !== undefined ? formatMoney(r.price_per_unit) : "";
      const unit = r.unit_of_measure ?? "";
      const sku = r.model_no ?? productId;

      return {
        id: `hd-live-${productId}`,
        supplier: "Home Depot",
        sku,
        name: r.name ?? "Home Depot product",
        description: [r.brand, r.department].filter(Boolean).join(" · "),
        imageUrl: image,
        category,
        price,
        unit,
        availability:
          r.availability?.trim() ||
          (r.in_stock === false ? "Out of stock" : r.in_stock === true ? "In stock" : ""),
        lastUpdated: new Date().toISOString(),
        brand: r.brand ?? "",
        pricingSource: "live",
        listPrice,
        pricePerUnit,
        unitOfMeasure: unit,
        productId,
        modelNo: r.model_no ?? "",
        upc: r.upc ?? "",
        url: r.url ?? "",
        image,
        inStock: r.in_stock ?? null,
        inventoryQuantity: qty,
        storeId,
        department: r.department ?? "",
        rating: r.rating ?? null,
        totalReviews: r.total_reviews ?? null,
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
