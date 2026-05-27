import { type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  AuthField,
  AuthPrimaryButton,
  AuthStayLoggedInToggle,
  AuthValidationList,
} from "@/components/auth/AuthFormFields";
import { AuthLinkRow, AuthScreenLayout } from "@/components/auth/AuthScreenLayout";
import { useAuth } from "@/lib/auth/AuthContext";
import { AUTH_LOGIN_HREF } from "@/lib/auth/authPaths";
import {
  normalizeAuthEmail,
  validatePassword,
  validatePasswordMatch,
} from "@/lib/auth/passwordValidation";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const passwordCheck = useMemo(() => validatePassword(password), [password]);
  const confirmError = useMemo(
    () => (confirmPassword ? validatePasswordMatch(password, confirmPassword) : null),
    [password, confirmPassword],
  );

  async function onSubmit() {
    const normalized = normalizeAuthEmail(email);
    if (!normalized || !normalized.includes("@")) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);

    if (!fullName.trim()) {
      Alert.alert("Sign up", "Enter your full name.");
      return;
    }
    if (!passwordCheck.valid) {
      Alert.alert("Sign up", passwordCheck.errors.join("\n"));
      return;
    }
    if (confirmError) {
      Alert.alert("Sign up", confirmError);
      return;
    }

    setBusy(true);
    const result = await signUp(
      {
        email: normalized,
        password,
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
      },
      stayLoggedIn,
    );
    setBusy(false);
    if (!result.ok && result.message) {
      Alert.alert("Sign up", result.message);
    }
  }

  return (
    <AuthScreenLayout
      title="Create account"
      subtitle="Set up your contractor workspace."
      footer={
        <AuthLinkRow prompt="Already have an account?" href={AUTH_LOGIN_HREF as Href} linkLabel="Sign in" />
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
        placeholder="Min 8 chars, 1 uppercase, 1 number"
        secureTextEntry
      />
      <AuthValidationList errors={password.length > 0 && !passwordCheck.valid ? passwordCheck.errors : []} />
      <AuthField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter password"
        secureTextEntry
        error={confirmError}
      />
      <AuthField
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Your name"
        autoCapitalize="words"
      />
      <AuthField
        label="Company name (optional)"
        value={companyName}
        onChangeText={setCompanyName}
        placeholder="Your business"
        autoCapitalize="words"
      />

      <AuthStayLoggedInToggle value={stayLoggedIn} onValueChange={setStayLoggedIn} />

      <AuthPrimaryButton label="Create account" onPress={() => void onSubmit()} busy={busy} />
    </AuthScreenLayout>
  );
}
