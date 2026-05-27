import type { PricingData, ProductWithPricing, SupplierProvider } from "../contracts";
import {
  escapeLikePatternForSql,
  expandTokenVariants,
  splitSearchTokensForCatalog,
} from "../catalogSearchText";
import { pool, requireDatabaseUrl } from "../../db/pool";

type ProductRow = {
  id: string;
  supplier: string;
  sku: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  price: string;
  unit: string;
  availability: string;
  last_updated: Date;
};

function tripleLike(paramIndex: number): string {
  return `(lower(p.name) LIKE $${paramIndex} ESCAPE '\\' OR lower(coalesce(p.description,'')) LIKE $${paramIndex} ESCAPE '\\' OR lower(p.sku) LIKE $${paramIndex} ESCAPE '\\' OR lower(coalesce(p.category,'')) LIKE $${paramIndex} ESCAPE '\\')`;
}

/** One search token: any variant may match (name / description / sku / category). */
function tokenGroupSql(startParamIndex: number, variants: string[]): { sql: string; params: string[]; nextIndex: number } {
  const params: string[] = [];
  const ors: string[] = [];
  let idx = startParamIndex;
  for (const v of variants) {
    params.push(`%${escapeLikePatternForSql(v)}%`);
    idx += 1;
    ors.push(tripleLike(idx));
  }
  return { sql: `(${ors.join(" OR ")})`, params, nextIndex: idx };
}

function buildStrictAndWhere(tokens: string[]): { where: string; params: string[] } {
  const params: string[] = [];
  const groups: string[] = [];
  let paramIdx = 0;
  for (const token of tokens) {
    const variants = expandTokenVariants(token);
    const { sql, params: ps, nextIndex } = tokenGroupSql(paramIdx, variants);
    paramIdx = nextIndex;
    params.push(...ps);
    groups.push(sql);
  }
  return { where: groups.join(" AND "), params };
}

function buildPhraseWhere(phrase: string): { where: string; params: string[] } {
  const p = `%${escapeLikePatternForSql(phrase.trim().toLowerCase())}%`;
  return { where: tripleLike(1), params: [p] };
}

/**
 * Broader match: any token variant hits. Score = number of tokens with at least one hit.
 */
function buildRelaxedOrWhere(tokens: string[]): { where: string; orderBy: string; params: string[] } {
  const params: string[] = [];
  const groupSqls: string[] = [];
  const caseParts: string[] = [];
  let paramIdx = 0;

  for (const token of tokens) {
    const variants = expandTokenVariants(token);
    const { sql, params: ps, nextIndex } = tokenGroupSql(paramIdx, variants);
    paramIdx = nextIndex;
    params.push(...ps);
    groupSqls.push(sql);
    caseParts.push(`(CASE WHEN ${sql} THEN 1 ELSE 0 END)`);
  }

  const where = `(${groupSqls.join(" OR ")})`;
  const orderBy = `(${caseParts.join(" + ")}) DESC, pr.price ASC NULLS LAST, pr.last_updated DESC`;
  return { where, orderBy, params };
}

const SELECT_BODY = `
      SELECT
        p.id,
        p.supplier,
        p.sku,
        p.name,
        coalesce(p.description,'') AS description,
        coalesce(p.image_url,'') AS image_url,
        coalesce(p.category,'') AS category,
        pr.price::text AS price,
        coalesce(pr.unit,'') AS unit,
        coalesce(pr.availability,'') AS availability,
        pr.last_updated
      FROM products p
      INNER JOIN pricing pr ON pr.product_id = p.id`;

function mapRows(rows: ProductRow[]): ProductWithPricing[] {
  return rows.map((r) => ({
    id: r.id,
    supplier: r.supplier,
    sku: r.sku,
    name: r.name,
    description: r.description,
    imageUrl: r.image_url,
    category: r.category,
    price: r.price,
    unit: r.unit,
    availability: r.availability,
    lastUpdated: new Date(r.last_updated).toISOString(),
    pricingSource: "estimate",
  }));
}

/** Primary fast path: read merged product + pricing rows from PostgreSQL. */
export class CachedDatabaseProvider implements SupplierProvider {
  readonly id = "cached_database";

  async searchProducts(query: string): Promise<ProductWithPricing[]> {
    requireDatabaseUrl();
    const raw = query.trim();
    if (!raw) return [];

    const tokens = splitSearchTokensForCatalog(raw);
    if (tokens.length === 0) return [];

    const run = async (where: string, params: string[], orderBy: string): Promise<ProductRow[]> => {
      const sql = `${SELECT_BODY}
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT 100`;
      const { rows } = await pool.query<ProductRow>(sql, params);
      return rows;
    };

    const defaultOrder = "p.supplier ASC, pr.price ASC NULLS LAST, pr.last_updated DESC";

    const strict = buildStrictAndWhere(tokens);
    let rows = await run(strict.where, strict.params, defaultOrder);
    if (rows.length > 0) return mapRows(rows);

    const phrase = buildPhraseWhere(raw);
    rows = await run(phrase.where, phrase.params, defaultOrder);
    if (rows.length > 0) return mapRows(rows);

    if (tokens.length > 1) {
      const relaxed = buildRelaxedOrWhere(tokens);
      rows = await run(relaxed.where, relaxed.params, relaxed.orderBy);
    }

    return mapRows(rows);
  }

  async getProductPrice(supplier: string, sku: string): Promise<PricingData | null> {
    requireDatabaseUrl();
    const { rows } = await pool.query<{
      product_id: string;
      supplier: string;
      price: string;
      unit: string;
      availability: string;
      last_updated: Date;
    }>(
      `
      SELECT pr.product_id, pr.supplier, pr.price::text, pr.unit, pr.availability, pr.last_updated
      FROM products p
      INNER JOIN pricing pr ON pr.product_id = p.id
      WHERE lower(p.supplier) = lower($1) AND lower(p.sku) = lower($2)
      LIMIT 1
    `,
      [supplier, sku],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      productId: r.product_id,
      supplier: r.supplier,
      price: r.price,
      unit: r.unit,
      availability: r.availability,
      lastUpdated: new Date(r.last_updated).toISOString(),
    };
  }

  async updateCachedPrices(): Promise<{ rowsAffected: number }> {
    requireDatabaseUrl();
    await pool.query("ANALYZE products");
    await pool.query("ANALYZE pricing");
    return { rowsAffected: 0 };
  }
}
