import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { SUPPLIER_INTEGRATION_SETTINGS_HREF } from "@/lib/supplierIntegration/navigateToSupplierIntegration";
import { deferRouterReplace } from "@/lib/deferNavigation";

/** Merged into Settings → Supplier Integrations (avoids legacy material-suppliers UI). */
export default function MaterialSuppliersSettingsScreen() {
  const router = useRouter();

  useEffect(() => {
    deferRouterReplace(router, SUPPLIER_INTEGRATION_SETTINGS_HREF);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
