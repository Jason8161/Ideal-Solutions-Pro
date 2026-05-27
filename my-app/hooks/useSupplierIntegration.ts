import { useCallback, useEffect, useRef, useState } from "react";

import type { MaterialsSearchTile } from "@/lib/materialsSearchSuppliers";
import { loadSupplierFavorites, loadSupplierIntegrationPrefs } from "@/lib/supplierIntegration/preferencesStorage";
import { buildQuickLaunchSuppliers } from "@/lib/supplierIntegration/quickLaunch";
import type {
  QuickLaunchSupplier,
  SupplierFavoritesState,
  SupplierIntegrationPrefs,
} from "@/lib/supplierIntegration/types";

export function useSupplierIntegration(tiles: MaterialsSearchTile[]) {
  const [prefs, setPrefs] = useState<SupplierIntegrationPrefs | null>(null);
  const [favorites, setFavorites] = useState<SupplierFavoritesState | null>(null);
  const [quickLaunch, setQuickLaunch] = useState<QuickLaunchSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const [p, f, ql] = await Promise.all([
        loadSupplierIntegrationPrefs(),
        loadSupplierFavorites(),
        buildQuickLaunchSuppliers(tiles),
      ]);
      if (!mountedRef.current) return;
      setPrefs(p);
      setFavorites(f);
      setQuickLaunch(ql);
    } catch {
      if (!mountedRef.current) return;
      setPrefs(null);
      setFavorites(null);
      setQuickLaunch([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [tiles]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    prefs,
    favorites,
    quickLaunch,
    loading,
    reload,
    setFavorites,
    setPrefs,
  };
}
