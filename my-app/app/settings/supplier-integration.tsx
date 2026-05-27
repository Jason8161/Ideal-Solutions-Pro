import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { deferRouterReplace } from "@/lib/deferNavigation";

const INTEGRATIONS_HREF = "/settings/integrations" as const;

/** Legacy route — merged into Supported Integrations. */
export default function SupplierIntegrationSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    deferRouterReplace(router, INTEGRATIONS_HREF);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
