import { Stack } from "expo-router";

import { EmployeeFeatureGate } from "@/components/subscription/EmployeeFeatureGate";

export default function EmployeeLayout() {
  return (
    <EmployeeFeatureGate>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="join" />
      <Stack.Screen name="clock" />
      <Stack.Screen name="field-tools" />
      <Stack.Screen name="field-tool-scaffold" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="time-off" />
      <Stack.Screen name="daily-notes" />
      <Stack.Screen name="ai-assistant" />
    </Stack>
    </EmployeeFeatureGate>
  );
}
