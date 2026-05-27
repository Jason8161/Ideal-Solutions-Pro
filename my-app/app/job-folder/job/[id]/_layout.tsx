import { Stack } from "expo-router";

export default function BossJobIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="draws" />
      <Stack.Screen name="notes" />
      <Stack.Screen name="report" />
    </Stack>
  );
}
