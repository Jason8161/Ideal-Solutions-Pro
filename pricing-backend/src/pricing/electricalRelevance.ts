/** Text blob used to score Home Depot (and similar) search rows for electrical material queries. */
export type ElectricalScorable = {
  name: string;
  brand?: string;
  category?: string;
  department?: string;
  description?: string;
};

const ELECTRICAL_QUERY =
  /\b(14\/2|12\/2|10\/2|14-2|12-2|10-2|romex|nm-?b|nmb|mc\s*cable|uf\s*cable|bx\s*cable|ac\s*cable|thhn|thwn|wire|cable|conduit|emt|pvc\s*pipe|breaker|panel|load\s*center|subpanel|receptacle|outlet|gfci|afci|switch|box|junction|lug|ground\s*rod|meter|disconnect|transformer|ballast|led\s*bulb|fixture|junction\s*box|entrance|service)\b/i;

const WIRE_QUERY = /\b(14\/2|12\/2|10\/2|14-2|12-2|10-2|romex|nm-?b|nmb|mc\s*cable|uf\s*cable|bx|wire|cable|awg|copper|conductor)\b/i;

const WIRE_POSITIVE =
  /\b(n-?m-?b|romex|soutwire|southwire|mc\s*cable|metal\s*clad|uf-?b|underground|feeder|building\s*wire|copper|conductor|awg|gauge|\/2|\/3|\/4|electrical\s*wire)\b/i;

const ELECTRICAL_POSITIVE =
  /\b(electrical|electric|wiring|conduit|emt|pvc|breaker|panel|receptacle|outlet|gfci|switch|junction|romex|nm-?b|mc\s*cable|uf\s*cable|wire|cable|lighting|ballast|fixture)\b/i;

const UNRELATED_NEGATIVE =
  /\b(paint|lumber|plywood|drywall|faucet|toilet|vanity|grill|patio|garden|mulch|seed|lawn|appliance|refrigerator|washer|dryer|furniture|mattress|rug|curtain|cabinet(?!.*electrical)|tile\s*floor|hardwood\s*floor|roofing\s*shingle|siding|insulation\s*batts?(?!.*electrical))\b/i;

/** Hardware / picture-hanging wire rope — not building wire (common noise on "wire" or "14-gauge" searches). */
const HARDWARE_WIRE_NEGATIVE =
  /\b(wire\s*rope|galvanized\s*steel|chains?\s*&\s*ropes?|picture\s*hanging|clothesline|barbed\s*wire|fence\s*wire|ook\b)\b/i;

const ELECTRICAL_CATEGORY = /\b(electrical|nm\s*wires?|building\s*wire)\b/i;

function blob(p: ElectricalScorable): string {
  return [p.name, p.brand, p.category, p.department, p.description].filter(Boolean).join(" ").toLowerCase();
}

export function isElectricalMaterialQuery(query: string): boolean {
  return ELECTRICAL_QUERY.test(query.trim());
}

export function isWireStyleQuery(query: string): boolean {
  return WIRE_QUERY.test(query.trim());
}

/**
 * Higher = more relevant for electrical contractors. Negative scores are dropped when filtering.
 */
export function scoreElectricalRelevance(query: string, product: ElectricalScorable): number {
  const q = query.trim().toLowerCase();
  const text = blob(product);
  if (!q) return 0;

  let score = 0;

  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  for (const t of tokens) {
    if (text.includes(t)) score += 4;
    const hyphen = t.replace(/\//g, "-");
    const slash = t.replace(/-/g, "/");
    if (t.includes("/") && text.includes(hyphen)) score += 6;
    if (t.includes("-") && text.includes(slash)) score += 6;
  }

  const catBlob = [product.category, product.department].filter(Boolean).join(" ").toLowerCase();
  if (ELECTRICAL_CATEGORY.test(catBlob)) score += 10;

  if (ELECTRICAL_POSITIVE.test(text)) score += 6;
  if (WIRE_POSITIVE.test(text)) score += 8;

  if (isWireStyleQuery(q)) {
    if (WIRE_POSITIVE.test(text)) score += 12;
    if (/\b(electrical|wire|cable)\b/i.test(product.department ?? "")) score += 6;
    if (HARDWARE_WIRE_NEGATIVE.test(text) && !WIRE_POSITIVE.test(text)) score -= 28;
    if (UNRELATED_NEGATIVE.test(text) && !WIRE_POSITIVE.test(text)) score -= 20;
  } else if (isElectricalMaterialQuery(q)) {
    if (ELECTRICAL_POSITIVE.test(text)) score += 8;
    if (UNRELATED_NEGATIVE.test(text) && !ELECTRICAL_POSITIVE.test(text)) score -= 15;
  } else {
    if (UNRELATED_NEGATIVE.test(text) && !ELECTRICAL_POSITIVE.test(text)) score -= 8;
  }

  return score;
}

export function filterAndRankElectricalResults<T extends ElectricalScorable>(
  query: string,
  rows: T[],
  options?: { minScore?: number; maxResults?: number },
): T[] {
  const maxResults = options?.maxResults ?? 24;
  const electricalQuery = isElectricalMaterialQuery(query) || isWireStyleQuery(query);
  const minScore = options?.minScore ?? (electricalQuery ? 4 : -Infinity);

  const scored = rows
    .map((row) => ({ row, score: scoreElectricalRelevance(query, row) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0 && electricalQuery && rows.length > 0) {
    return rows
      .map((row) => ({ row, score: scoreElectricalRelevance(query, row) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ row }) => row);
  }

  return scored.slice(0, maxResults).map(({ row }) => row);
}
