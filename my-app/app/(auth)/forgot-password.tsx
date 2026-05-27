import { type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import { getAccentTints } from "@/components/themed/screenChrome";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

import { AuthField, AuthPrimaryButton } from "@/components/auth/AuthFormFields";
import { AuthLinkRow, AuthScreenLayout } from "@/components/auth/AuthScreenLayout";
import { requestPasswordReset } from "@/lib/auth/authApi";
import { AUTH_LOGIN_HREF } from "@/lib/auth/authPaths";
import { normalizeAuthEmail } from "@/lib/auth/passwordValidation";

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const statusStyles = useMemo(() => makeStatusStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  async function onSubmit() {
    const normalized = normalizeAuthEmail(email);
    if (!normalized || !normalized.includes("@")) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    setBusy(true);
    const result = await requestPasswordReset(normalized);
    setBusy(false);
    setSentMessage(result.message);
    Alert.alert("Password reset", result.message);
  }

  return (
    <AuthScreenLayout
      title="Forgot password"
      subtitle="We will email reset steps when email delivery is connected."
      footer={
        <AuthLinkRow prompt="Remembered it?" href={AUTH_LOGIN_HREF as Href} linkLabel="Back to sign in" />
      }
    >
      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        keyboardType="email-address"
        error={emailError}
      />

      {sentMessage ? <Text style={statusStyles.message}>{sentMessage}</Text> : null}

      <AuthPrimaryButton label="Send reset link" onPress={() => void onSubmit()} busy={busy} />
    </AuthScreenLayout>
  );
}

function makeStatusStyles(colors: ColorScheme) {
  const { accentTintLight } = getAccentTints(colors);
  return StyleSheet.create({
    message: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      backgroundColor: accentTintLight,
      borderRadius: 10,
      padding: 12,
    },
  });
}
