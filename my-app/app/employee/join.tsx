import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenDebugBanner } from "@/components/debug/ScreenDebugBanner";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, inputStyle, placeholderTextColor, type ResponsiveTypography } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useResponsiveTypography } from "@/lib/layout/responsiveTypography";
import { hasCloudApi, redeemCloudInvite } from "@/lib/cloud/client";
import { getOrCreateDeviceId } from "@/lib/cloud/deviceId";
import { syncEmployeeAssignments } from "@/lib/cloud/jobAssignments";
import { registerEmployeePushTokenIfPossible } from "@/lib/cloud/pushToken";
import { cloudRoleToAppRole } from "@/lib/auth/roles";
import { persistRoleFromCloud } from "@/lib/auth/sessionRole";
import { saveEmployeeSession } from "@/lib/employeeSession";
import {
  loadProTrialRecord,
  startProTrial,
} from "@/lib/subscriptions/trialStorage";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

const EMPLOYEE_TRIAL_INTEREST_TIER = "side_hustle" as const;
const INVALID_INVITE_MESSAGE =
  "Invalid invitation code. Please check the code and try again.";

function inviteCodeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  const lower = raw.toLowerCase();
  if (
    lower.includes("invalid") ||
    lower.includes("not found") ||
    lower.includes("expired") ||
    (lower.includes("invite") && !lower.includes("configured"))
  ) {
    return INVALID_INVITE_MESSAGE;
  }
  if (!raw) {
    return INVALID_INVITE_MESSAGE;
  }
  return raw;
}

export default function EmployeeJoinScreen() {
  const { scStyles } = useBossManChrome();
  const { colors } = useAppTheme();
  const typo = useResponsiveTypography();
  const fieldInput = useMemo(
    () => inputStyle(colors, getAccentTints(colors), undefined, typo.isTablet),
    [colors, typo.isTablet],
  );
  const inlineStyles = useMemo(() => makeInlineStyles(colors, typo), [colors, typo.isTablet]);
  const router = useRouter();
  const { refresh, proTrial } = useSubscription();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fromLink = typeof params.code === "string" ? params.code.trim() : "";
    if (fromLink) setCode(fromLink.toUpperCase());
  }, [params.code]);

  const cloudReady = hasCloudApi();
  const guestTrialActive = proTrial.isActive;

  const onRedeem = useCallback(async () => {
    setCodeError(null);
    setSubmitError(null);

    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setCodeError("Enter the invitation code sent by your employer.");
      return;
    }

    if (!cloudReady) {
      setSubmitError(
        guestTrialActive
          ? "Invite join needs server access. Set EXPO_PUBLIC_PRICING_API_URL in my-app/.env, then restart Expo."
          : "Server not configured. Set EXPO_PUBLIC_PRICING_API_URL in my-app/.env to your pricing-backend URL, then restart Expo.",
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

      const trialRecord = await loadProTrialRecord();
      if (!trialRecord?.trialStartDate) {
        await startProTrial({ interestTier: EMPLOYEE_TRIAL_INTEREST_TIER });
        await refresh();
      }

      await syncEmployeeAssignments();
      void registerEmployeePushTokenIfPossible();
      router.replace("/employee" as Href);
    } catch (e) {
      setSubmitError(inviteCodeErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [cloudReady, code, displayName, guestTrialActive, refresh, router]);

  const placeholderColor = useMemo(() => placeholderTextColor(colors), [colors]);

  return (
    <>
      <ScreenDebugBanner screenId="app/employee/join.tsx" />
      <ScStickyScroll
      backHref="/employee"
      title="Employee Access"
      subtitle="Enter the invitation code sent by your employer."
    >
      <Text style={scStyles.cardTitle}>Invitation code</Text>
      <VoiceTextInput
        value={code}
        onChangeText={(t) => {
          setCode(t.toUpperCase());
          if (codeError) setCodeError(null);
          if (submitError) setSubmitError(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABCD1234"
        placeholderTextColor={placeholderColor}
        style={[fieldInput, codeError ? inlineStyles.inputError : null, { marginBottom: codeError ? 6 : 12 }]}
      />
      {codeError ? <Text style={inlineStyles.errorText}>{codeError}</Text> : null}

      <Text style={[scStyles.cardTitle, { marginTop: codeError ? 10 : 0 }]}>Your name (optional)</Text>
      <VoiceTextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="How your team sees you"
        placeholderTextColor={placeholderColor}
        style={[fieldInput, { marginBottom: 20 }]}
      />

      {submitError ? <Text style={[inlineStyles.errorText, { marginBottom: 12 }]}>{submitError}</Text> : null}

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
    </>
  );
}

function makeInlineStyles(colors: ColorScheme, typo: ResponsiveTypography) {
  return StyleSheet.create({
    errorText: {
      color: colors.text, fontSize: typo.hintFontSize,
      lineHeight: typo.hintLineHeight,
    },
    inputError: {
      borderColor: "rgba(255,120,120,0.75)",
    },
  });
}
