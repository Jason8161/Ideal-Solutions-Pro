import { IapComingSoonScreen } from "@/components/settings/IapComingSoonScreen";
import { getIapCategory } from "@/lib/iapSettingsCategories";

export default function IapMaterialsScreen() {
  const category = getIapCategory("materials");
  if (!category) return null;

  return (
    <IapComingSoonScreen
      category={category}
      bullets={[
        "In-app supplier ordering for Graybar, Rexel, City Electric, Grainger, and retail lookups.",
        "Side-by-side supplier pricing add-ons (see MaterialSearchActionsSheet roadmap).",
        "Separate from subscription wholesale access on Boss Man and above.",
      ]}
    />
  );
}
