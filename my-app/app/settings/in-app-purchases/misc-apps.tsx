import { IapComingSoonScreen } from "@/components/settings/IapComingSoonScreen";
import { getIapCategory } from "@/lib/iapSettingsCategories";

export default function IapMiscAppsScreen() {
  const category = getIapCategory("misc-apps");
  if (!category) return null;

  return (
    <IapComingSoonScreen
      category={category}
      bullets={[
        "Curated third-party shortcuts from miscAppsCatalog (maps, finance, news, and more).",
        "Premium packs for home-screen quick launch tiles.",
        "RevenueCat product IDs will be added when store listings are ready.",
      ]}
    />
  );
}
