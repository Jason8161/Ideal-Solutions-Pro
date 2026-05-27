import type { SupplierSearchError } from "@/services/pricing/searchCatalog";

/** Map API supplier error codes/messages to actionable setup text. */
export function humanizeCatalogSupplierError(supplier: string, rawMessage: string): string {
  const msg = rawMessage.trim();
  if (!msg) return "Unknown catalog error";

  const isDbSupplier = supplier === "catalog_db" || supplier === "city_electric_catalog";
  if (isDbSupplier) {
    if (/ECONNREFUSED|connect ECONNREFUSED|127\.0\.0\.1:5432|::1:5432/i.test(msg)) {
      return (
        "Catalog database offline — start Postgres on your PC (pricing-backend: npm run db:up or npm run setup:local), " +
        "then npm run import:catalogs and restart npm run dev. CSV estimates may still show until the DB is up."
      );
    }
    if (/DATABASE_URL|not set on the pricing/i.test(msg)) {
      return "Set DATABASE_URL in pricing-backend/.env (see env.example), then run npm run setup:local.";
    }
    if (/relation .* does not exist|42P01|tables are missing/i.test(msg)) {
      return "Catalog database not migrated — in pricing-backend: npm run migrate && npm run import:catalogs.";
    }
    if (/Postgres is not running/i.test(msg)) {
      return msg;
    }
  }

  if (supplier === "csv_file" && /No catalog CSV/i.test(msg)) {
    return "No supplier CSV files in pricing-backend/catalogs/. Add catalogs and run npm run import:catalogs.";
  }

  if (supplier === "config") {
    return msg;
  }

  return msg;
}

export function formatSupplierErrorLine(err: SupplierSearchError): string {
  const message = humanizeCatalogSupplierError(err.supplier, err.message);
  if (err.supplier === "catalog_db" || err.supplier === "city_electric_catalog") {
    return message;
  }
  return `${err.supplier}: ${message}`;
}

/** True when every error is only the Postgres catalog source (CSV/live may still work). */
export function isCatalogDatabaseOnlyErrors(errors: SupplierSearchError[]): boolean {
  if (errors.length === 0) return false;
  return errors.every((e) => e.supplier === "catalog_db" || e.supplier === "city_electric_catalog");
}

/** One-line summary for material-list catalogError when search returns errors but no rows. */
export function summarizeCatalogErrors(errors: SupplierSearchError[]): string {
  if (errors.length === 0) return "Catalog search failed.";
  const unique = [...new Set(errors.map((e) => formatSupplierErrorLine(e)))];
  return unique.slice(0, 2).join(" ");
}
