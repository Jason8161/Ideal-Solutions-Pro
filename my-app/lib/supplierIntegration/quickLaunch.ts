import type { MaterialsSearchTile } from "@/lib/materialsSearchSuppliers";
import { loadSupplierAccount } from "@/lib/supplierIntegration/accountSecureStorage";
import { resolveBranchProximity } from "@/lib/supplierIntegration/branchLocationService";
import { detectInstalledMap } from "@/lib/supplierIntegration/detectionService";
import { loadSupplierFavorites } from "@/lib/supplierIntegration/preferencesStorage";
import { getSupplierById } from "@/lib/supplierIntegration/supplierRegistry";
import type { QuickLaunchSupplier } from "@/lib/supplierIntegration/types";

function tileSupplierId(tile: MaterialsSearchTile): string {
  return tile.kind === "app" ? tile.key : tile.presetId;
}

function sortQuickLaunch(
  ids: string[],
  favorites: {
    favoriteIds: string[];
    hiddenIds: string[];
    orderIds: string[];
    lastUsedAt: Record<string, number>;
  },
): string[] {
  const favoriteSet = new Set(favorites.favoriteIds);
  const orderIndex = new Map(favorites.orderIds.map((id, i) => [id, i]));
  const hidden = new Set(favorites.hiddenIds);

  return [...ids]
    .filter((id) => !hidden.has(id))
    .sort((a, b) => {
      const af = favoriteSet.has(a) ? 0 : 1;
      const bf = favoriteSet.has(b) ? 0 : 1;
      if (af !== bf) return af - bf;
      const ao = orderIndex.get(a);
      const bo = orderIndex.get(b);
      if (ao != null && bo != null) return ao - bo;
      if (ao != null) return -1;
      if (bo != null) return 1;
      const at = favorites.lastUsedAt[a] ?? 0;
      const bt = favorites.lastUsedAt[b] ?? 0;
      return bt - at;
    });
}

/** Build quick-launch supplier rows from materials-search tiles + saved favorites. */
export async function buildQuickLaunchSuppliers(
  tiles: MaterialsSearchTile[],
): Promise<QuickLaunchSupplier[]> {
  const favorites = await loadSupplierFavorites();
  const hidden = new Set(favorites.hiddenIds);
  const ids = sortQuickLaunch(
    tiles.map(tileSupplierId).filter((id) => !hidden.has(id)),
    favorites,
  );

  const installedMap = await detectInstalledMap(ids);
  const favoriteSet = new Set(favorites.favoriteIds);

  const rows: QuickLaunchSupplier[] = [];
  for (const id of ids) {
    const tile = tiles.find((t) => tileSupplierId(t) === id);
    const record = getSupplierById(id);
    if (!record && !tile) continue;

    const account = await loadSupplierAccount(id);
    const branch = await resolveBranchProximity(id, account?.preferredBranchName);

    rows.push({
      ...(record ?? {
        id,
        name: tile?.name ?? id,
        category: "other",
        icon: "store",
        website: "https://www.google.com/",
      }),
      favorite: favoriteSet.has(id) || id === favorites.defaultSupplierId,
      installed: installedMap[id] === true,
      lastUsedAt: favorites.lastUsedAt[id],
      preferredBranch: account?.preferredBranchName,
      branchDistanceMi: branch?.distanceMi,
    });
  }

  return rows;
}
