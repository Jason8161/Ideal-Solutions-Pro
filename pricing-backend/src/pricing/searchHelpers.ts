import type { ProductWithPricing } from "./contracts";

export type SupplierSearchError = {
  supplier: string;
  message: string;
};

/** Turn low-level DB/network errors into setup steps for API clients. */
export function humanizeSupplierError(supplier: string, rawMessage: string): string {
  const msg = rawMessage.trim();
  if (!msg) return "Unknown supplier error";

  const isDbSupplier = supplier === "catalog_db" || supplier === "city_electric_catalog";
  if (isDbSupplier) {
    if (/ECONNREFUSED|connect ECONNREFUSED|127\.0\.0\.1:5432|::1:5432/i.test(msg)) {
      return (
        "Postgres is not running on this machine. In pricing-backend run: npm run db:up (or npm run setup:local), " +
        "then npm run import:catalogs. Restart npm run dev. CSV file estimates may still appear until the DB is up."
      );
    }
    if (/DATABASE_URL/i.test(msg) || /not set on the pricing/i.test(msg)) {
      return (
        "DATABASE_URL is not set in pricing-backend/.env. Copy env.example to .env, then run npm run setup:local."
      );
    }
    if (/relation .* does not exist|42P01/i.test(msg)) {
      return "Database tables are missing. In pricing-backend run: npm run migrate && npm run import:catalogs.";
    }
    if (/password authentication failed|28P01/i.test(msg)) {
      return "Postgres login failed — check DATABASE_URL in pricing-backend/.env matches docker-compose (postgres/postgres).";
    }
  }

  if (supplier === "csv_file") {
    if (/No catalog CSV|not found in/i.test(msg)) {
      return (
        "No catalog CSV files found. Add supplier files under pricing-backend/catalogs/, then npm run import:catalogs."
      );
    }
  }

  if (supplier === "city_electric_catalog") {
    if (/cityelectric|city electric/i.test(msg)) {
      return (
        "City Electric rows need catalogs/cityelectric.csv and npm run import:catalogs (or Postgres up with that file imported)."
      );
    }
  }

  return msg;
}

/** Format errors from pg, fetch, or AggregateError for logs and API responses. */
export function formatProviderError(e: unknown): string {
  if (e instanceof AggregateError) {
    const parts = e.errors
      .map((inner) => formatProviderError(inner))
      .filter((m) => m.length > 0 && m !== "AggregateError");
    if (parts.length > 0) return parts.join("; ");
    return "One or more connections failed (database or network). Check DATABASE_URL and Postgres.";
  }
  if (e instanceof Error) {
    const m = e.message?.trim();
    if (m && m !== "AggregateError") return m;
    if (e.cause) {
      const c = formatProviderError(e.cause);
      if (c && c !== "AggregateError") return c;
    }
    if (e.name && e.name !== "Error" && e.name !== "AggregateError") return e.name;
  }
  if (e && typeof e === "object") {
    const o = e as { code?: unknown; message?: unknown };
    if (typeof o.message === "string" && o.message.trim() && o.message.trim() !== "AggregateError") {
      const code = typeof o.code === "string" ? o.code : undefined;
      return code ? `${o.message.trim()} (${code})` : o.message.trim();
    }
    if (typeof o.code === "string") return `Database error (${o.code})`;
  }
  if (typeof e === "string" && e.trim() && e.trim() !== "AggregateError") return e.trim();
  try {
    const s = JSON.stringify(e);
    if (s && s !== "{}" && s !== '"AggregateError"') return s;
  } catch {
    /* ignore */
  }
  return "Unknown supplier error";
}

export type SearchSourceSpec = {
  supplier: string;
  search: () => Promise<ProductWithPricing[]>;
};

/**
 * Run each supplier in isolation via Promise.allSettled.
 * One failure never rejects the batch.
 */
export async function fetchAllSuppliers(sources: SearchSourceSpec[]): Promise<{
  chunks: ProductWithPricing[][];
  errors: SupplierSearchError[];
}> {
  const settled = await Promise.allSettled(sources.map((s) => s.search()));
  const chunks: ProductWithPricing[][] = [];
  const errors: SupplierSearchError[] = [];

  settled.forEach((outcome, index) => {
    const supplierName = sources[index]?.supplier ?? `supplier_${index}`;
    if (outcome.status === "fulfilled") {
      chunks.push(Array.isArray(outcome.value) ? outcome.value : []);
      return;
    }
    console.error("Supplier fetch failed", supplierName, outcome.reason);
    const raw = formatProviderError(outcome.reason);
    errors.push({
      supplier: supplierName,
      message: humanizeSupplierError(supplierName, raw),
    });
    chunks.push([]);
  });

  return { chunks, errors };
}
