import fs from "fs";
import path from "path";
import { CSVProvider } from "../pricing/providers/CSVProvider";
import { pool } from "../db/pool";

export type SupplierRowCounts = Record<string, number>;

export type CatalogImportResult = {
  ok: boolean;
  totalRows: number;
  files: { path: string; rows: number; bySupplier: SupplierRowCounts }[];
  bySupplier: SupplierRowCounts;
  error?: string;
};

export function resolveCatalogsDir(): string {
  const configured = process.env.CATALOGS_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.resolve(process.cwd(), "catalogs");
}

/** All `.csv` files in the catalogs folder (non-recursive). */
export function listCatalogCsvFiles(catalogsDir: string): string[] {
  if (!fs.existsSync(catalogsDir)) return [];
  return fs
    .readdirSync(catalogsDir)
    .filter((name) => name.toLowerCase().endsWith(".csv"))
    .map((name) => path.join(catalogsDir, name))
    .sort();
}

/**
 * Import every CSV in `catalogs/` plus optional `PRICING_CSV_PATH` when it is not already included.
 */
export async function importAllCatalogCsvs(): Promise<CatalogImportResult> {
  const catalogsDir = resolveCatalogsDir();
  const paths = new Set(listCatalogCsvFiles(catalogsDir));

  const legacyPath = process.env.PRICING_CSV_PATH?.trim();
  if (legacyPath) {
    const resolved = path.resolve(legacyPath);
    if (fs.existsSync(resolved)) paths.add(resolved);
  }

  if (paths.size === 0) {
    return {
      ok: false,
      totalRows: 0,
      files: [],
      bySupplier: {},
      error: `No catalog CSV files found in ${catalogsDir} (and PRICING_CSV_PATH is unset or missing).`,
    };
  }

  const files: CatalogImportResult["files"] = [];
  const bySupplier: SupplierRowCounts = {};

  try {
    for (const filePath of paths) {
      const { rowsAffected, bySupplier: fileCounts } = await CSVProvider.importFromFile(filePath);
      files.push({ path: filePath, rows: rowsAffected, bySupplier: fileCounts });
      for (const [supplier, count] of Object.entries(fileCounts)) {
        bySupplier[supplier] = (bySupplier[supplier] ?? 0) + count;
      }
    }

    await pool.query("ANALYZE products");
    await pool.query("ANALYZE pricing");

    const totalRows = files.reduce((sum, f) => sum + f.rows, 0);
    for (const [supplier, count] of Object.entries(bySupplier)) {
      console.log(`[catalog] ${supplier}: ${count} row(s) imported`);
    }
    console.log(`[catalog] import complete: ${totalRows} row(s) from ${files.length} file(s)`);

    return { ok: true, totalRows, files, bySupplier };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      totalRows: files.reduce((sum, f) => sum + f.rows, 0),
      files,
      bySupplier,
      error: msg,
    };
  }
}

/** Live product counts grouped by supplier (store catalog). */
export async function querySupplierProductCounts(): Promise<
  { supplier: string; productCount: number }[]
> {
  const { rows } = await pool.query<{ supplier: string; product_count: string }>(`
    SELECT supplier, COUNT(*)::text AS product_count
    FROM products
    GROUP BY supplier
    ORDER BY supplier ASC
  `);
  return rows.map((r) => ({
    supplier: r.supplier,
    productCount: Number.parseInt(r.product_count, 10) || 0,
  }));
}
