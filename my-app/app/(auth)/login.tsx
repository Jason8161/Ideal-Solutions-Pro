import { Link, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";

import {
  AuthField,
  AuthPrimaryButton,
  AuthStayLoggedInToggle,
} from "@/components/auth/AuthFormFields";
import { AuthLinkRow, AuthScreenLayout } from "@/components/auth/AuthScreenLayout";
import { useAuth } from "@/lib/auth/AuthContext";
import { AUTH_FORGOT_HREF, AUTH_SIGNUP_HREF } from "@/lib/auth/authPaths";
import { normalizeAuthEmail } from "@/lib/auth/passwordValidation";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useAppTheme();
  const linkStyles = useMemo(() => makeLinkStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function onSubmit() {
    const normalized = normalizeAuthEmail(email);
    if (!normalized || !normalized.includes("@")) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    if (!password) {
      Alert.alert("Login", "Enter your password.");
      return;
    }

    setBusy(true);
    const result = await signIn(normalized, password, stayLoggedIn);
    setBusy(false);
    if (!result.ok && result.message) {
      Alert.alert("Login", result.message);
    }
  }

  return (
    <AuthScreenLayout
      title="Sign in"
      subtitle="Access your jobs, crew, and billing."
      footer={
        <AuthLinkRow prompt="New here?" href={AUTH_SIGNUP_HREF as Href} linkLabel="Create account" />
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
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
      />

      <AuthStayLoggedInToggle value={stayLoggedIn} onValueChange={setStayLoggedIn} />

      <Link href={AUTH_FORGOT_HREF as Href} asChild>
        <Pressable accessibilityRole="link">
          <Text style={linkStyles.forgot}>Forgot password?</Text>
        </Pressable>
      </Link>

      <AuthPrimaryButton label="Sign in" onPress={() => void onSubmit()} busy={busy} />
    </AuthScreenLayout>
  );
}

function makeLinkStyles(colors: ColorScheme) {
  return StyleSheet.create({
    forgot: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "right",
      marginTop: -4,
    },
  });
}
