/**
 * Shared material catalog search helpers (Postgres + CSV file search).
 * Electrical SKUs often use "14/2" in data while users type "14-2"; multi-word
 * queries can fail strict AND when one word is a colloquialism ("romex").
 */

/** Escape `%`, `_`, and `\` for SQL LIKE … ESCAPE '\\'. */
export function escapeLikePatternForSql(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

import { splitCatalogSearchTokens } from "./materialsSearchQuery";

/** Lowercased whitespace tokens from the user query. */
export function splitSearchTokens(raw: string): string[] {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Catalog AND matching: drops stop words and length-only tokens; normalizes gauge/length phrasing. */
export function splitSearchTokensForCatalog(raw: string): string[] {
  const catalogTokens = splitCatalogSearchTokens(raw);
  return catalogTokens.length > 0 ? catalogTokens : splitSearchTokens(raw);
}

/**
 * Common variants for a single token (e.g. hyphen vs slash in wire counts).
 */
export function expandTokenVariants(token: string): string[] {
  const t = token.trim().toLowerCase();
  if (!t) return [];
  const out = new Set<string>([t]);
  if (t.includes("-")) {
    const slash = t.replace(/-/g, "/");
    if (slash !== t) out.add(slash);
  }
  if (t.includes("/")) {
    const dash = t.replace(/\//g, "-");
    if (dash !== t) out.add(dash);
  }
  return [...out];
}

/** Lowercased single-string haystack for CSV row matching. */
export function csvHaystackForRow(parts: { name: string; description: string; sku: string; category: string }): string {
  return `${parts.name} ${parts.description} ${parts.sku} ${parts.category}`.toLowerCase();
}

/** Strict AND: every token matches at least one of its variants as a substring. */
export function csvRowMatchesStrictTokens(hay: string, tokens: string[]): boolean {
  return tokens.every((token) => {
    const variants = expandTokenVariants(token);
    return variants.some((v) => hay.includes(v));
  });
}

/** Any token variant matches (broader fallback). */
export function csvRowMatchesAnyToken(hay: string, tokens: string[]): boolean {
  return tokens.some((token) => expandTokenVariants(token).some((v) => hay.includes(v)));
}

/** Whole trimmed query as substring (after lowercasing hay). */
export function csvRowMatchesPhrase(hay: string, phrase: string): boolean {
  const p = phrase.trim().toLowerCase();
  return p.length > 0 && hay.includes(p);
}

/** Count how many tokens have at least one variant hit (for ranking). */
export function csvTokenMatchCount(hay: string, tokens: string[]): number {
  let n = 0;
  for (const token of tokens) {
    if (expandTokenVariants(token).some((v) => hay.includes(v))) n += 1;
  }
  return n;
}
