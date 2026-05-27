import { Alert } from "react-native";
import { Share } from "react-native";
import type { Router } from "expo-router";

import { deferRouterPush } from "@/lib/deferNavigation";

type ActionContext = {
  query: string;
  supplierId?: string;
  supplierName?: string;
  router: Router;
};

/**
 * Material search item / query actions — wires existing flows where available.
 */
export function showMaterialSearchActions(ctx: ActionContext): void {
  const q = ctx.query.trim();
  const label = q.length > 0 ? `"${q}"` : "this search";

  Alert.alert("Material actions", `What would you like to do with ${label}?`, [
    {
      text: "Add to material list",
      onPress: () => {
        if (q.length > 0) {
          void import("expo-clipboard").then((Clipboard) =>
            Clipboard.setStringAsync(q).then(() =>
              Alert.alert("Copied", "Search term copied. Paste it as a line on your material list."),
            ),
          );
        }
        deferRouterPush(ctx.router, "/material-list");
      },
    },
    {
      text: "Open supplier app",
      onPress: () => {
        if (!ctx.supplierId) {
          Alert.alert("Choose a supplier", "Tap a supplier in quick launch or the grid below.");
          return;
        }
        void import("@/lib/openMaterialSupplier").then(({ openMaterialsSearchEntry }) =>
          openMaterialsSearchEntry(ctx.supplierId!, q ? { query: q } : undefined),
        );
      },
    },
    {
      text: "Compare suppliers",
      onPress: () => {
        Alert.alert(
          "Compare suppliers",
          "Side-by-side pricing across suppliers is coming soon. For now, open each supplier app or website from quick launch.",
        );
      },
    },
    {
      text: "Share search",
      onPress: () => {
        void Share.share({
          message: q.length > 0 ? `Material search: ${q}` : "Material search from Ideal Solutions Pro",
        });
      },
    },
    {
      text: "Order now",
      onPress: () => {
        Alert.alert(
          "Order now",
          "In-app ordering is not connected yet. Use Open supplier app to place orders in the supplier's app or website.",
        );
      },
    },
    { text: "Cancel", style: "cancel" },
  ]);
}
