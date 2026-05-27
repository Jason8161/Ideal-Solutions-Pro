import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="group/[groupId]" />
      <Stack.Screen name="user-info" />
      <Stack.Screen name="business-card-qr" />
      <Stack.Screen name="business-card-display" />
      <Stack.Screen name="virtual-business-card" />
      <Stack.Screen name="logos" />
      <Stack.Screen name="button-images" />
      <Stack.Screen name="home-button-images" />
      <Stack.Screen name="home-screen-buttons" />
      <Stack.Screen name="suppliers" />
      <Stack.Screen name="material-suppliers" />
      <Stack.Screen name="integrations" />
      <Stack.Screen name="supplier-integration" />
      <Stack.Screen name="misc-apps" />
      <Stack.Screen name="subscribe" />
      <Stack.Screen name="admin-free-access" />
      <Stack.Screen name="ai-addons" />
      <Stack.Screen name="employee-ai" />
      <Stack.Screen name="my-crew" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="maps-addresses" />
      <Stack.Screen name="social-media" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="backup-restore" />
      <Stack.Screen name="legal-stuff" />
      <Stack.Screen name="legal/[docId]" />
      <Stack.Screen name="services-description" />
      <Stack.Screen name="display" />
      <Stack.Screen name="job-folder-tabs" />
      <Stack.Screen name="accounting" />
      <Stack.Screen name="accounting-billing" />
      <Stack.Screen name="payment-apps" />
      <Stack.Screen name="invoice-customization" />
      <Stack.Screen name="invoice-payments" />
      <Stack.Screen name="legal-data-privacy" />
      <Stack.Screen name="legal-liability" />
    </Stack>
  );
}
