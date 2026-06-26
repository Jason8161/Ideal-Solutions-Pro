import { Stack } from "expo-router";

export default function InAppPurchasesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="ai-addons" />
      <Stack.Screen name="misc-apps" />
      <Stack.Screen name="materials" />
      <Stack.Screen name="crew-ai" />
    </Stack>
  );
}
