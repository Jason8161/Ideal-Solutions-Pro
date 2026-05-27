import path from "path";
import { resolveCatalogsDir } from "../../catalog/catalogImport";
import type { ProductWithPricing, SupplierProvider } from "../contracts";
import { isCityElectricSupplier } from "../supplierAliases";
import { CachedDatabaseProvider } from "./CachedDatabaseProvider";
import { CSVProvider } from "./CSVProvider";

/**
 * City Electric Supply — catalog/CSV only (no Unwrangle live platform).
 * Rows use supplier slug `cityelectric` or label "City Electric" from catalogs/cityelectric.csv.
 */
export class CityElectricCatalogProvider implements SupplierProvider {
  readonly id = "city_electric_catalog";

  async searchProducts(query: string): Promise<ProductWithPricing[]> {
    let rows: ProductWithPricing[];
    try {
      rows = await new CachedDatabaseProvider().searchProducts(query);
    } catch {
      const csvPath = path.join(resolveCatalogsDir(), "cityelectric.csv");
      rows = CSVProvider.searchSingleCsvFile(csvPath, query);
    }
    return rows
      .filter((r) => isCityElectricSupplier(r.supplier))
      .map((r) => ({
        ...r,
        supplier: "City Electric",
        pricingSource: "estimate" as const,
      }));
  }

  async getProductPrice(supplier: string, sku: string) {
    if (!isCityElectricSupplier(supplier)) return null;
    return new CachedDatabaseProvider().getProductPrice(supplier, sku);
  }

  async updateCachedPrices(): Promise<{ rowsAffected: number }> {
    return { rowsAffected: 0 };
  }
}
