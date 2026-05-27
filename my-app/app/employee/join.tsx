import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, inputStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { hasCloudApi, redeemCloudInvite } from "@/lib/cloud/client";
import { getOrCreateDeviceId } from "@/lib/cloud/deviceId";
import { syncEmployeeAssignments } from "@/lib/cloud/jobAssignments";
import { registerEmployeePushTokenIfPossible } from "@/lib/cloud/pushToken";
import { cloudRoleToAppRole } from "@/lib/auth/roles";
import { persistRoleFromCloud } from "@/lib/auth/sessionRole";
import { saveEmployeeSession } from "@/lib/employeeSession";

export default function EmployeeJoinScreen() {
  const { scStyles } = useBossManChrome();
  const { colors } = useAppTheme();
  const fieldInput = useMemo(() => inputStyle(colors, getAccentTints(colors)), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromLink = typeof params.code === "string" ? params.code.trim() : "";
    if (fromLink) setCode(fromLink.toUpperCase());
  }, [params.code]);

  const cloudReady = hasCloudApi();

  const onRedeem = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert("Invite code", "Enter the code from your employer.");
      return;
    }
    if (!cloudReady) {
      Alert.alert(
        "Server not configured",
        "Set EXPO_PUBLIC_PRICING_API_URL in my-app/.env to your pricing-backend URL, then restart Expo.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await redeemCloudInvite({
        code: trimmed,
        displayName: displayName.trim() || undefined,
        deviceId: await getOrCreateDeviceId(),
      });
      const name =
        result.user.displayName ||
        [result.employee?.firstName, result.employee?.lastName].filter(Boolean).join(" ") ||
        "Employee";
      const appRole = cloudRoleToAppRole(result.user.roleId);
      await persistRoleFromCloud(result.user.roleId);
      await saveEmployeeSession({
        active: true,
        role: appRole,
        displayName: name,
        employeeId: result.employee?.localEmployeeId || undefined,
        companyId: result.company.id,
        companyName: result.company.name,
        cloudUserId: result.user.id,
        cloudEmployeeId: result.employee?.id,
        cloudAuthToken: result.authToken,
        permissions: result.employee?.permissions ?? {},
      });
      await syncEmployeeAssignments();
      void registerEmployeePushTokenIfPossible();
      Alert.alert("Welcome", `You're connected to ${result.company.name || "your company"}.`, [
        { text: "OK", onPress: () => router.replace("/employee" as Href) },
      ]);
    } catch (e) {
      Alert.alert("Could not join", e instanceof Error ? e.message : "Try again or ask your boss for a new code.");
    } finally {
      setBusy(false);
    }
  }, [cloudReady, code, displayName, router]);

  const placeholderColor = useMemo(() => "rgba(255,255,255,0.45)", []);

  return (
    <ScStickyScroll
      backHref="/employee"
      title="Join with invite"
      subtitle="Enter the code from your employer's text or email."
    >
      <Text style={scStyles.cardTitle}>Invite code</Text>
      <VoiceTextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABCD1234"
        placeholderTextColor={placeholderColor}
        style={[fieldInput, { marginBottom: 12 }]}
      />
      <Text style={scStyles.cardTitle}>Your name (optional)</Text>
      <VoiceTextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="How your team sees you"
        placeholderTextColor={placeholderColor}
        style={[fieldInput, { marginBottom: 20 }]}
      />
      <Pressable
        style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}
        onPress={() => void onRedeem()}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={scStyles.primaryCtaText}>Join company</Text>
        )}
      </Pressable>
    </ScStickyScroll>
  );
}
