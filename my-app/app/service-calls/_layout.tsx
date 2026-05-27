import { Stack } from "expo-router";

import { FeatureGate } from "@/components/subscription/FeatureGate";

export default function ServiceCallsLayout() {
  return (
    <FeatureGate feature="service_calls">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </FeatureGate>
  );
}
