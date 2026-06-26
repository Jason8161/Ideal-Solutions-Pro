import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text } from "react-native";

import { replaceWithAuthScreen } from "@/components/auth/AuthIntentLink";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, inputStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  acceptCompanyInvite,
  hasCompanyUserApi,
  previewCompanyInvite,
} from "@/lib/company/companyUserApi";
import { companyRoleLabel } from "@/lib/permissions/companyRoles";

export default function AcceptInviteScreen() {
  const { scStyles } = useBossManChrome();
  const { colors } = useAppTheme();
  const fieldInput = useMemo(() => inputStyle(colors, getAccentTints(colors)), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewRole, setPreviewRole] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const placeholderColor = useMemo(() => "#888888", []);

  useEffect(() => {
    const fromLink = typeof params.code === "string" ? params.code.trim() : "";
    if (fromLink) setCode(fromLink.toUpperCase());
  }, [params.code]);

  useEffect(() => {
    const trimmed = code.trim();
    if (trimmed.length < 6 || !hasCompanyUserApi()) return;
    let cancelled = false;
    setLoadingPreview(true);
    void previewCompanyInvite(trimmed)
      .then((res) => {
        if (cancelled) return;
        setPreviewEmail(res.invite.email);
        setPreviewRole(res.invite.roleLabel);
      })
      .catch(() => {
        if (cancelled) return;
        setPreviewEmail("");
        setPreviewRole("");
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const onAccept = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert("Invite code", "Enter the code from your invitation email.");
      return;
    }
    if (!hasCompanyUserApi()) {
      Alert.alert(
        "Server not configured",
        "Set EXPO_PUBLIC_PRICING_API_URL in my-app/.env to your pricing-backend URL.",
      );
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password", "Use at least 8 characters with uppercase and a number.");
      return;
    }
    setBusy(true);
    try {
      const result = await acceptCompanyInvite({
        code: trimmed,
        password,
        fullName: fullName.trim() || undefined,
      });
      Alert.alert(
        "Account ready",
        `${result.message} Role: ${companyRoleLabel(result.roleId)}. Sign in to continue.`,
        [{ text: "Sign in", onPress: () => replaceWithAuthScreen(router, "/login" as Href) }],
      );
    } catch (e) {
      Alert.alert("Could not join", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [code, fullName, password, router]);

  return (
    <ScStickyScroll title="Join your company" subtitle="Accept invitation">
      <Text style={[scStyles.subtitle, { marginBottom: 16 }]}>
        Enter your invite code and choose a password. Your email and role were set by your employer.
      </Text>
      <Text style={scStyles.cardTitle}>Invite code</Text>
      <VoiceTextInput
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        autoCapitalize="characters"
        placeholder="ABCD1234"
        placeholderTextColor={placeholderColor}
        style={[fieldInput, { marginBottom: 12 }]}
      />
      {loadingPreview ? (
        <ActivityIndicator style={{ marginVertical: 8 }} />
      ) : previewEmail ? (
        <Text style={[scStyles.cardMeta, { marginBottom: 12 }]}>
          Joining as {previewEmail} ┬╖ {previewRole}
        </Text>
      ) : null}
      <Text style={scStyles.cardTitle}>Your name (optional)</Text>
      <VoiceTextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Display name"
        placeholderTextColor={placeholderColor}
        style={[fieldInput, { marginBottom: 12 }]}
      />
      <Text style={scStyles.cardTitle}>Password</Text>
      <VoiceTextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 characters"
        placeholderTextColor={placeholderColor}
        style={[fieldInput, { marginBottom: 20 }]}
      />
      <Pressable
        style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}
        onPress={() => void onAccept()}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={scStyles.primaryCtaText}>Create account & join</Text>
        )}
      </Pressable>
    </ScStickyScroll>
  );
}
