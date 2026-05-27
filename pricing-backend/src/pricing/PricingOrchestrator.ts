import type { ProductWithPricing, SupplierProvider } from "./contracts";
import { importAllCatalogCsvs } from "../catalog/catalogImport";
import { rankSearchResultsByLength, type SearchLengthQtyOptions } from "./lengthQty";
import { extractWireGauge, normalizeMaterialsSearchInput } from "./materialsSearchQuery";
import { mergeAllSearchChunks } from "./mergeResults";
import { fetchAllSuppliers, type SupplierSearchError } from "./searchHelpers";
import { CachedDatabaseProvider } from "./providers/CachedDatabaseProvider";
import { CSVProvider } from "./providers/CSVProvider";
import { FutureAPIProvider } from "./providers/FutureAPIProvider";
import { CityElectricCatalogProvider } from "./providers/CityElectricCatalogProvider";
import { HomeDepotApiProvider } from "./providers/HomeDepotApiProvider";
import { LowesUnwrangleProvider } from "./providers/LowesUnwrangleProvider";
import { isCityElectricSupplier } from "./supplierAliases";
import { matchesVendorPreset, isAllowedVendorPreset } from "./vendorPresetMatch";
import { MockProvider } from "./providers/MockProvider";
import { isDatabaseReachable, pool } from "../db/pool";
import { humanizeSupplierError } from "./searchHelpers";

export type SearchProductsResponse = {
  query: string;
  length?: number;
  lengthUnit?: "ft" | "m";
  qty?: number;
  results: ProductWithPricing[];
  errors: SupplierSearchError[];
  warnings?: SupplierSearchError[];
};

const REFRESH_LOCK_KEY = 923_451;

/**
 * Single entry for HTTP handlers and cron: swap providers without rewriting routes.
 */
export class PricingOrchestrator {
  private readonly providers: SupplierProvider[];

  private prepareSearch(
    query: string,
    lengthQty: SearchLengthQtyOptions,
  ): { catalogQuery: string; lengthQty: SearchLengthQtyOptions; wireGauge: string | null } {
    const normalized = normalizeMaterialsSearchInput(query, lengthQty);
    const merged: SearchLengthQtyOptions = {
      qty: normalized.qty,
      length: normalized.length,
      lengthUnit: normalized.lengthUnit,
    };
    const wireGauge = extractWireGauge(normalized.originalQuery) ?? extractWireGauge(normalized.catalogQuery);
    return { catalogQuery: normalized.catalogQuery, lengthQty: merged, wireGauge };
  }

  constructor() {
    const csvPath = process.env.PRICING_CSV_PATH;
    this.providers = [
      new CachedDatabaseProvider(),
      new CSVProvider(csvPath),
      new FutureAPIProvider(),
      new MockProvider(),
    ];
  }

  private async appendCatalogDbSource(
    sources: { supplier: string; search: () => Promise<ProductWithPricing[]> }[],
    catalogQuery: string,
    warnings: SupplierSearchError[],
  ): Promise<void> {
    if (!(await isDatabaseReachable())) {
      warnings.push({
        supplier: "catalog_db",
        message: humanizeSupplierError(
          "catalog_db",
          "connect ECONNREFUSED 127.0.0.1:5432",
        ),
      });
      return;
    }
    sources.push({
      supplier: "catalog_db",
      search: () => new CachedDatabaseProvider().searchProducts(catalogQuery),
    });
  }

  /**
   * Each supplier/source is fetched in its own try/catch via Promise.allSettled.
   * Never throws for per-supplier failures.
   *
   * @param vendorPresetFilter When non-null and non-empty, only runs live Lowe's / Home Depot
   *   Unwrangle calls if those preset ids are included (saves API usage). Catalog DB + CSV + City Electric always run.
   */
  async searchProducts(
    query: string,
    lengthQty: SearchLengthQtyOptions = { qty: 1 },
    vendorPresetFilter: string[] | null = null,
  ): Promise<SearchProductsResponse> {
    const { catalogQuery, lengthQty: mergedLengthQty, wireGauge } = this.prepareSearch(query, lengthQty);
    const csvPath = process.env.PRICING_CSV_PATH;
    const unwrangleKey = process.env.UNWRANGLE_API_KEY?.trim();
    const homeDepotKey =
      process.env.HOMEDEPOT_API_KEY?.trim() || process.env.UNWRANGLE_API_KEY?.trim();
    const homeDepotStore = process.env.HOMEDEPOT_STORE_NO?.trim();
    const homeDepotZip = process.env.HOMEDEPOT_ZIPCODE?.trim();
    const homeDepotBase = process.env.HOMEDEPOT_API_BASE_URL?.trim();

    const wantsLiveVendor = (preset: string) =>
      !vendorPresetFilter || vendorPresetFilter.length === 0 || vendorPresetFilter.includes(preset);

    const sources: { supplier: string; search: () => Promise<ProductWithPricing[]> }[] = [
      {
        supplier: "csv_file",
        search: () => new CSVProvider(csvPath).searchProductsFromFile(catalogQuery),
      },
      {
        supplier: "city_electric_catalog",
        search: () => new CityElectricCatalogProvider().searchProducts(catalogQuery),
      },
    ];
    const warnings: SupplierSearchError[] = [];
    await this.appendCatalogDbSource(sources, catalogQuery, warnings);

    if (unwrangleKey && wantsLiveVendor("lowes")) {
      sources.push({
        supplier: "lowes_live",
        search: () => new LowesUnwrangleProvider(unwrangleKey).searchProducts(catalogQuery),
      });
    }

    if (homeDepotKey && wantsLiveVendor("homedepot")) {
      sources.push({
        supplier: "homedepot_api",
        search: () =>
          new HomeDepotApiProvider({
            apiKey: homeDepotKey,
            storeNo: homeDepotStore,
            zipcode: homeDepotZip,
            baseUrl: homeDepotBase,
          }).searchProducts(catalogQuery),
      });
    }

    const { chunks, errors } = await fetchAllSuppliers(sources);

    if (homeDepotKey && wantsLiveVendor("homedepot") && (!homeDepotStore || !homeDepotZip)) {
      warnings.push({
        supplier: "homedepot_api",
        message:
          "Set HOMEDEPOT_STORE_NO and HOMEDEPOT_ZIPCODE in pricing-backend/.env for store-local Home Depot prices (Unwrangle requires both).",
      });
    }

    let results = mergeAllSearchChunks(chunks);
    results = rankSearchResultsByLength(results, { ...mergedLengthQty, wireGauge });

    const q = query.trim();
    if (q.length > 0 && !results.some((r) => isCityElectricSupplier(r.supplier))) {
      warnings.push({
        supplier: "city_electric",
        message:
          "No City Electric rows for this query (optional vendor). Add catalogs/cityelectric.csv and run npm run import:catalogs if you need them.",
      });
    }

    if (results.length === 0 && errors.length > 0) {
      console.warn("[pricing] search returned no rows;", errors.map((e) => `${e.supplier}: ${e.message}`).join(" | "));
    }

    const response: SearchProductsResponse = { query, results, errors };
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    if (mergedLengthQty.length !== undefined) {
      response.length = mergedLengthQty.length;
      response.lengthUnit = mergedLengthQty.lengthUnit ?? "ft";
    }
    if (mergedLengthQty.qty > 1) {
      response.qty = mergedLengthQty.qty;
    }
    return response;
  }

  /** Local catalog + CSV + City Electric only — no live Unwrangle (fast estimates). */
  async searchEstimatesOnly(
    query: string,
    lengthQty: SearchLengthQtyOptions = { qty: 1 },
  ): Promise<SearchProductsResponse> {
    const { catalogQuery, lengthQty: mergedLengthQty, wireGauge } = this.prepareSearch(query, lengthQty);
    const csvPath = process.env.PRICING_CSV_PATH;
    const sources: { supplier: string; search: () => Promise<ProductWithPricing[]> }[] = [
      {
        supplier: "csv_file",
        search: () => new CSVProvider(csvPath).searchProductsFromFile(catalogQuery),
      },
      {
        supplier: "city_electric_catalog",
        search: () => new CityElectricCatalogProvider().searchProducts(catalogQuery),
      },
    ];
    const warnings: SupplierSearchError[] = [];
    await this.appendCatalogDbSource(sources, catalogQuery, warnings);
    const { chunks, errors } = await fetchAllSuppliers(sources);
    let results = mergeAllSearchChunks(chunks);
    results = rankSearchResultsByLength(results, { ...mergedLengthQty, wireGauge });
    const response: SearchProductsResponse = { query, results, errors };
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    if (mergedLengthQty.length !== undefined) {
      response.length = mergedLengthQty.length;
      response.lengthUnit = mergedLengthQty.lengthUnit ?? "ft";
    }
    if (mergedLengthQty.qty > 1) {
      response.qty = mergedLengthQty.qty;
    }
    return response;
  }

  /** Sources relevant to one supply-house preset; results filtered to that vendor. */
  async searchVendorPreset(
    query: string,
    lengthQty: SearchLengthQtyOptions,
    presetRaw: string,
  ): Promise<SearchProductsResponse> {
    const { catalogQuery, lengthQty: mergedLengthQty, wireGauge } = this.prepareSearch(query, lengthQty);
    const preset = presetRaw.trim().toLowerCase();
    const csvPath = process.env.PRICING_CSV_PATH;
    const unwrangleKey = process.env.UNWRANGLE_API_KEY?.trim();
    const homeDepotKey =
      process.env.HOMEDEPOT_API_KEY?.trim() || process.env.UNWRANGLE_API_KEY?.trim();
    const homeDepotStore = process.env.HOMEDEPOT_STORE_NO?.trim();
    const homeDepotZip = process.env.HOMEDEPOT_ZIPCODE?.trim();
    const homeDepotBase = process.env.HOMEDEPOT_API_BASE_URL?.trim();

    const sources: { supplier: string; search: () => Promise<ProductWithPricing[]> }[] = [
      {
        supplier: "csv_file",
        search: () => new CSVProvider(csvPath).searchProductsFromFile(catalogQuery),
      },
    ];
    const warnings: SupplierSearchError[] = [];
    await this.appendCatalogDbSource(sources, catalogQuery, warnings);

    if (preset === "cityelectric") {
      sources.push({
        supplier: "city_electric_catalog",
        search: () => new CityElectricCatalogProvider().searchProducts(catalogQuery),
      });
    }

    if (preset === "lowes" && unwrangleKey) {
      sources.push({
        supplier: "lowes_live",
        search: () => new LowesUnwrangleProvider(unwrangleKey).searchProducts(catalogQuery),
      });
    }

    if (preset === "homedepot" && homeDepotKey) {
      sources.push({
        supplier: "homedepot_api",
        search: () =>
          new HomeDepotApiProvider({
            apiKey: homeDepotKey,
            storeNo: homeDepotStore,
            zipcode: homeDepotZip,
            baseUrl: homeDepotBase,
          }).searchProducts(catalogQuery),
      });
    }

    const { chunks, errors } = await fetchAllSuppliers(sources);

    if (preset === "homedepot" && homeDepotKey && (!homeDepotStore || !homeDepotZip)) {
      warnings.push({
        supplier: "homedepot_api",
        message:
          "Set HOMEDEPOT_STORE_NO and HOMEDEPOT_ZIPCODE in pricing-backend/.env for store-local Home Depot prices (Unwrangle requires both).",
      });
    }

    let results = mergeAllSearchChunks(chunks);
    results = results.filter((r) => matchesVendorPreset(r.supplier, preset));
    results = rankSearchResultsByLength(results, { ...mergedLengthQty, wireGauge });

    const response: SearchProductsResponse = { query, results, errors };
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    if (mergedLengthQty.length !== undefined) {
      response.length = mergedLengthQty.length;
      response.lengthUnit = mergedLengthQty.lengthUnit ?? "ft";
    }
    if (mergedLengthQty.qty > 1) {
      response.qty = mergedLengthQty.qty;
    }
    return response;
  }

  async getProductPrice(supplier: string, sku: string) {
    try {
      return await this.providers[0].getProductPrice(supplier, sku);
    } catch (e) {
      console.error("[pricing] getProductPrice failed:", e instanceof Error ? e.message : e);
      return null;
    }
  }

  /** Weekly job: import all `catalogs/*.csv` (+ optional PRICING_CSV_PATH), ANALYZE, log per supplier. */
  async runWeeklyCatalogRefresh(): Promise<{
    ok: boolean;
    rows: number;
    bySupplier: Record<string, number>;
    error?: string;
  }> {
    const { rows: lockRows } = await pool.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [REFRESH_LOCK_KEY],
    );
    if (!lockRows[0]?.acquired) {
      return { ok: true, rows: 0, bySupplier: {} };
    }

    try {
      await pool.query(
        `UPDATE pricing_refresh_state SET
          last_run_started_at = now(),
          last_weekly_run_started_at = now(),
          last_error = NULL,
          last_run_finished_at = NULL,
          last_weekly_run_finished_at = NULL
        WHERE id = 1`,
      );

      const imported = await importAllCatalogCsvs();
      if (!imported.ok) {
        const msg = imported.error ?? "Catalog import failed";
        await pool
          .query(
            `UPDATE pricing_refresh_state SET last_error = $1, last_run_finished_at = now(), last_weekly_run_finished_at = now() WHERE id = 1`,
            [msg],
          )
          .catch(() => {});
        return { ok: false, rows: imported.totalRows, bySupplier: imported.bySupplier, error: msg };
      }

      await pool.query(
        `UPDATE pricing_refresh_state SET
          last_run_finished_at = now(),
          last_run_rows = $1,
          last_run_provider = $2,
          last_weekly_run_finished_at = now(),
          last_weekly_run_rows = $1,
          last_weekly_supplier_counts = $3::jsonb
        WHERE id = 1`,
        [imported.totalRows, "catalogs_csv", JSON.stringify(imported.bySupplier)],
      );
      return { ok: true, rows: imported.totalRows, bySupplier: imported.bySupplier };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await pool
        .query(
          `UPDATE pricing_refresh_state SET last_error = $1, last_run_finished_at = now(), last_weekly_run_finished_at = now() WHERE id = 1`,
          [msg],
        )
        .catch(() => {});
      return { ok: false, rows: 0, bySupplier: {}, error: msg };
    } finally {
      await pool.query("SELECT pg_advisory_unlock($1)", [REFRESH_LOCK_KEY]).catch(() => {});
    }
  }

  /** Alias for admin refresh endpoint and legacy callers. */
  async runScheduledPriceRefresh(): Promise<{ ok: boolean; rows: number; error?: string }> {
    const out = await this.runWeeklyCatalogRefresh();
    return { ok: out.ok, rows: out.rows, error: out.error };
  }
}
