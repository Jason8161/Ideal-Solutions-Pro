import { Stack } from "expo-router";

export default function JobFolderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="boss-man" />
      <Stack.Screen name="hub" />
      <Stack.Screen name="current-jobs" />
      <Stack.Screen name="completed-jobs" />
      <Stack.Screen name="new" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="job-photos" />
      <Stack.Screen name="time-payroll" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="crew" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="job/[id]" />
      <Stack.Screen name="estimates" />
    </Stack>
  );
}
