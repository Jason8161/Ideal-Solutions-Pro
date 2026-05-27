import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { listCatalogCsvFiles, resolveCatalogsDir } from "../../catalog/catalogImport";
import {
  csvHaystackForRow,
  csvRowMatchesAnyToken,
  csvRowMatchesPhrase,
  csvRowMatchesStrictTokens,
  csvTokenMatchCount,
  splitSearchTokensForCatalog,
} from "../catalogSearchText";
import type { PricingData, ProductWithPricing, SupplierProvider } from "../contracts";
import { pool } from "../../db/pool";
import { CachedDatabaseProvider } from "./CachedDatabaseProvider";

type CsvRow = {
  supplier?: string;
  sku?: string;
  name?: string;
  description?: string;
  image_url?: string;
  category?: string;
  price?: string;
  unit?: string;
  availability?: string;
};

/**
 * Imports rows from a CSV on disk into `products` + `pricing`.
 * Configure path with PRICING_CSV_PATH — no bundled catalog in the mobile app.
 */
export class CSVProvider implements SupplierProvider {
  readonly id = "csv";

  constructor(private readonly csvPath: string | undefined) {}

  async searchProducts(query: string): Promise<ProductWithPricing[]> {
    const cached = new CachedDatabaseProvider();
    return cached.searchProducts(query);
  }

  /** Search catalog CSVs on disk without Postgres (fallback when DB is down). */
  async searchProductsFromFile(query: string): Promise<ProductWithPricing[]> {
    const paths = new Set<string>();
    for (const filePath of listCatalogCsvFiles(resolveCatalogsDir())) {
      paths.add(filePath);
    }
    if (this.csvPath) {
      const resolved = path.resolve(this.csvPath);
      if (fs.existsSync(resolved)) paths.add(resolved);
    }
    if (paths.size === 0) return [];

    const byKey = new Map<string, ProductWithPricing>();
    for (const filePath of paths) {
      for (const row of CSVProvider.searchSingleCsvFile(filePath, query)) {
        byKey.set(`${row.supplier}\0${row.sku}`, row);
      }
    }
    return [...byKey.values()].slice(0, 100);
  }

  /** Read one CSV and return token-matched rows (no database). */
  static searchSingleCsvFile(csvPath: string, query: string): ProductWithPricing[] {
    if (!fs.existsSync(csvPath)) return [];

    const raw = query.trim();
    if (!raw) return [];

    const tokens = splitSearchTokensForCatalog(raw);
    if (tokens.length === 0) return [];

    const buf = fs.readFileSync(csvPath, "utf8");
    const records = parse(buf, { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[];

    type Scored = { score: number; row: ProductWithPricing };
    const scored: Scored[] = [];

    for (const row of records) {
      if (!row.supplier || !row.sku || !row.name || row.price === undefined || row.price === "") continue;
      const hay = csvHaystackForRow({
        name: row.name,
        description: row.description ?? "",
        sku: row.sku,
        category: row.category ?? "",
      });

      let score = 0;
      if (csvRowMatchesStrictTokens(hay, tokens)) {
        score = 100 + tokens.length;
      } else if (csvRowMatchesPhrase(hay, raw)) {
        score = 50;
      } else if (tokens.length > 1 && csvRowMatchesAnyToken(hay, tokens)) {
        score = csvTokenMatchCount(hay, tokens);
      } else {
        continue;
      }

      const supplier = row.supplier.trim().toLowerCase();
      scored.push({
        score,
        row: {
          id: `csv-${supplier}-${row.sku}`,
          supplier,
          sku: row.sku,
          name: row.name,
          description: row.description ?? "",
          imageUrl: row.image_url ?? "",
          category: row.category ?? "",
          price: String(row.price),
          unit: row.unit ?? "",
          availability: row.availability ?? "",
          lastUpdated: new Date().toISOString(),
        pricingSource: "estimate",
        },
      });
    }

    scored.sort((a, b) => b.score - a.score || Number(a.row.price) - Number(b.row.price));
    return scored.map((s) => s.row).slice(0, 100);
  }

  async getProductPrice(supplier: string, sku: string): Promise<PricingData | null> {
    const cached = new CachedDatabaseProvider();
    return cached.getProductPrice(supplier, sku);
  }

  async updateCachedPrices(): Promise<{ rowsAffected: number }> {
    if (!this.csvPath || !fs.existsSync(this.csvPath)) {
      return { rowsAffected: 0 };
    }
    const { rowsAffected } = await CSVProvider.importFromFile(this.csvPath);
    return { rowsAffected };
  }

  /** Import one catalog CSV file; returns row totals and per-supplier counts. */
  static async importFromFile(
    csvPath: string,
  ): Promise<{ rowsAffected: number; bySupplier: Record<string, number> }> {
    if (!fs.existsSync(csvPath)) {
      return { rowsAffected: 0, bySupplier: {} };
    }

    const buf = fs.readFileSync(csvPath, "utf8");
    const records = parse(buf, { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[];

    let count = 0;
    const bySupplier: Record<string, number> = {};
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const row of records) {
        if (!row.supplier || !row.sku || !row.name || row.price === undefined || row.price === "") continue;
        const priceNum = Number(row.price);
        if (Number.isNaN(priceNum)) continue;

        const supplierKey = row.supplier.trim().toLowerCase();

        const { rows: pRows } = await client.query<{ id: string }>(
          `
          INSERT INTO products (supplier, sku, name, description, image_url, category)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (supplier, sku) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            category = EXCLUDED.category,
            updated_at = now()
          RETURNING id
        `,
          [supplierKey, row.sku, row.name, row.description ?? "", row.image_url ?? "", row.category ?? ""],
        );

        const productId = pRows[0].id;
        await client.query(
          `
          INSERT INTO pricing (product_id, supplier, price, unit, availability, last_updated)
          VALUES ($1, $2, $3, $4, $5, now())
          ON CONFLICT (product_id) DO UPDATE SET
            supplier = EXCLUDED.supplier,
            price = EXCLUDED.price,
            unit = EXCLUDED.unit,
            availability = EXCLUDED.availability,
            last_updated = now()
        `,
          [productId, supplierKey, priceNum, row.unit ?? "", row.availability ?? ""],
        );
        count += 1;
        bySupplier[supplierKey] = (bySupplier[supplierKey] ?? 0) + 1;
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return { rowsAffected: count, bySupplier };
  }
}
