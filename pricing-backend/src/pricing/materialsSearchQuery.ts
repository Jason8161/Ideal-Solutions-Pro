import type { LengthUnit } from "./lengthQty";

const SEARCH_STOP_WORDS = new Set([
  "of",
  "the",
  "a",
  "an",
  "with",
  "for",
  "and",
  "or",
  "to",
  "in",
  "on",
  "at",
  "by",
  "ft",
  "feet",
  "foot",
  "footage",
  "meter",
  "meters",
  "m",
]);

/** Feet / meters spelled out or abbreviated (including 1000'). */
const LENGTH_FEET_RE = /\b(\d+(?:\.\d+)?)\s*(?:'|′|ft\.?|feet|foot|footage)\b/gi;
const LENGTH_FEET_APOSTROPHE_RE = /\b(\d+(?:\.\d+)?)'/gi;
const LENGTH_METERS_RE = /\b(\d+(?:\.\d+)?)\s*m(?:eter|etre|eters|etres)?\b/gi;
const WIRE_GAUGE_RE = /\b(\d{1,2})\s*[-/](\d{1,2})\b/i;

export type NormalizedMaterialsSearch = {
  /** Query sent to catalog DB, CSV, and live retailer APIs. */
  catalogQuery: string;
  /** Original trimmed user text. */
  originalQuery: string;
  length?: number;
  lengthUnit: LengthUnit;
};

/** Pull requested pack length from free-text (e.g. 1000', 500 ft, 100 m). */
export function extractLengthFromQuery(query: string): { length?: number; lengthUnit: LengthUnit } {
  const t = query.trim();
  if (!t) return { lengthUnit: "ft" };

  const mMatch = t.match(/\b(\d+(?:\.\d+)?)\s*m(?:eter|etre|eters|etres)?\b/i);
  if (mMatch) {
    const n = Number.parseFloat(mMatch[1]);
    if (Number.isFinite(n) && n > 0) return { length: n, lengthUnit: "m" };
  }

  for (const re of [LENGTH_FEET_RE, LENGTH_FEET_APOSTROPHE_RE]) {
    re.lastIndex = 0;
    const m = re.exec(t);
    if (m) {
      const n = Number.parseFloat(m[1]);
      if (Number.isFinite(n) && n > 0) return { length: n, lengthUnit: "ft" };
    }
  }

  return { lengthUnit: "ft" };
}

/** Normalize 14-2 → 14/2 for matching. */
export function extractWireGauge(query: string): string | null {
  const m = query.trim().match(WIRE_GAUGE_RE);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

function stripLengthPhrases(query: string): string {
  return query
    .replace(LENGTH_FEET_RE, " ")
    .replace(LENGTH_FEET_APOSTROPHE_RE, " ")
    .replace(LENGTH_METERS_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a supplier-friendly query: wire gauge + product terms + optional length in ft
 * (helps phrase match when users typed 1000' in the search box).
 */
export function buildCatalogSearchQuery(query: string, lengthFt?: number): string {
  const gauge = extractWireGauge(query);
  const stripped = stripLengthPhrases(query);
  const tokens = stripped
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !SEARCH_STOP_WORDS.has(t));

  const parts: string[] = [];
  if (gauge) parts.push(gauge);
  for (const t of tokens) {
    const norm = t.replace(/-/g, "/");
    if (gauge && (norm === gauge || t === gauge.replace(/\//g, "-"))) continue;
    if (!parts.includes(t)) parts.push(t);
  }
  if (lengthFt !== undefined && lengthFt > 0) {
    const ftLabel = `${Math.round(lengthFt)} ft`;
    if (!parts.includes(ftLabel)) {
      parts.push(String(Math.round(lengthFt)), "ft");
    }
  }

  const built = parts.join(" ").trim();
  return built.length > 0 ? built : query.trim();
}

/** Tokens for strict AND catalog matching (no stop words or bare length tokens). */
export function splitCatalogSearchTokens(raw: string): string[] {
  const normalized = buildCatalogSearchQuery(raw);
  return normalized
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !SEARCH_STOP_WORDS.has(t) && !/^\d+(?:\.\d+)?$/.test(t));
}

/**
 * Merge explicit `length` query param with length/gauge parsed from free text.
 */
export function normalizeMaterialsSearchInput(
  query: string,
  lengthQty: { length?: number; lengthUnit?: LengthUnit; qty: number },
): NormalizedMaterialsSearch & { qty: number } {
  const originalQuery = query.trim();
  const fromText = extractLengthFromQuery(originalQuery);
  const length = lengthQty.length ?? fromText.length;
  const lengthUnit = lengthQty.lengthUnit ?? fromText.lengthUnit ?? "ft";
  const lengthFt =
    length !== undefined && length > 0 ? (lengthUnit === "m" ? length * 3.280839895 : length) : undefined;
  const catalogQuery = buildCatalogSearchQuery(originalQuery, lengthFt);
  return {
    originalQuery,
    catalogQuery,
    length,
    lengthUnit,
    qty: lengthQty.qty,
  };
}
