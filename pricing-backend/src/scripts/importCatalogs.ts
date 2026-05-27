import "dotenv/config";
import { importAllCatalogCsvs, resolveCatalogsDir } from "../catalog/catalogImport";
import { pool } from "../db/pool";

async function main() {
  console.log(`Importing catalogs from ${resolveCatalogsDir()} …`);
  const result = await importAllCatalogCsvs();
  if (!result.ok) {
    console.error(result.error ?? "Import failed");
    process.exit(1);
  }
  for (const [supplier, count] of Object.entries(result.bySupplier)) {
    console.log(`  ${supplier}: ${count} row(s)`);
  }
  console.log(`Done: ${result.totalRows} row(s) from ${result.files.length} file(s).`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
