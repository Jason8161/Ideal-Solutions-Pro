import { Stack } from "expo-router";

export default function CrewLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="list" />
      <Stack.Screen name="dispatch" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="coming-soon" />
      <Stack.Screen name="employees/[id]" />
    </Stack>
  );
}
