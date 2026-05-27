import type { LengthUnit, ParsedLengthQty } from "@/lib/materialsLengthQtyShared";

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

const LENGTH_FEET_RE = /\b(\d+(?:\.\d+)?)\s*(?:'|′|ft\.?|feet|foot|footage)\b/gi;
const LENGTH_FEET_APOSTROPHE_RE = /\b(\d+(?:\.\d+)?)'/gi;
const LENGTH_METERS_RE = /\b(\d+(?:\.\d+)?)\s*m(?:eter|etre|eters|etres)?\b/gi;
const WIRE_GAUGE_RE = /\b(\d{1,2})\s*[-/](\d{1,2})\b/i;

export type NormalizedMaterialsSearch = {
  catalogQuery: string;
  originalQuery: string;
  length?: number;
  lengthUnit: LengthUnit;
  qty: number;
};

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
    if (!parts.includes(String(Math.round(lengthFt)))) {
      parts.push(String(Math.round(lengthFt)), "ft");
    }
  }

  const built = parts.join(" ").trim();
  return built.length > 0 ? built : query.trim();
}

/** Merge Length field with length/gauge parsed from the search box. */
export function normalizeMaterialsSearchInput(
  query: string,
  parsed: ParsedLengthQty,
): NormalizedMaterialsSearch {
  const originalQuery = query.trim();
  const fromText = extractLengthFromQuery(originalQuery);
  const length = parsed.length ?? fromText.length;
  const lengthUnit = parsed.lengthUnit ?? fromText.lengthUnit ?? "ft";
  const lengthFt =
    length !== undefined && length > 0 ? (lengthUnit === "m" ? length * 3.280839895 : length) : undefined;
  const catalogQuery = buildCatalogSearchQuery(originalQuery, lengthFt);
  return {
    originalQuery,
    catalogQuery,
    length,
    lengthUnit,
    qty: parsed.qty,
  };
}
