import type { MiscCatalogFilter, MiscIntegrationDefinition } from "@/lib/integrations/types";

export function miscIntegrationMatchesSearch(
  def: MiscIntegrationDefinition,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = def.name.toLowerCase();
  const idHaystack = def.id.replace(/_/g, " ").toLowerCase();
  const categoryHaystack = def.category === "games" ? "game games gaming" : "work app tool";
  return (
    name.includes(q) ||
    idHaystack.includes(q) ||
    q.includes(name) ||
    categoryHaystack.includes(q)
  );
}

export function miscIntegrationMatchesCategory(
  def: MiscIntegrationDefinition,
  filter: MiscCatalogFilter,
): boolean {
  if (filter === "all") return true;
  return def.category === filter;
}

export function filterMiscIntegrations(
  defs: readonly MiscIntegrationDefinition[],
  query: string,
  category: MiscCatalogFilter,
): MiscIntegrationDefinition[] {
  return defs.filter(
    (def) => miscIntegrationMatchesCategory(def, category) && miscIntegrationMatchesSearch(def, query),
  );
}
