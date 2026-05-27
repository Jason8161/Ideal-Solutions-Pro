import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { VoiceTextInput } from "@/components/VoiceTextInput";
import {
  getAccentTints,
  inputStyle,
  onAccentTextColor,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType = "default",
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  error?: string | null;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeFieldStyles(colors), [colors]);
  const fieldStyle = useMemo(() => inputStyle(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <VoiceTextInput
        style={[fieldStyle, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor(colors)}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={false}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  onPress,
  busy,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeButtonStyles(colors), [colors]);
  const isDisabled = disabled || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        style,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator color={onAccentTextColor(colors)} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function AuthStayLoggedInToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeToggleStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>Stay logged in</Text>
        <Text style={styles.hint}>Off = sign in again after you close the app.</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.text}
      />
    </View>
  );
}

export function AuthValidationList({ errors }: { errors: string[] }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeValidationStyles(colors), [colors]);
  if (errors.length === 0) return null;

  return (
    <View style={styles.box}>
      {errors.map((err) => (
        <Text key={err} style={styles.item}>
          • {err}
        </Text>
      ))}
    </View>
  );
}

function makeFieldStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      gap: 6,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    inputError: {
      borderWidth: 1,
      borderColor: colors.accent,
    },
    error: {
      color: colors.accent,
      fontSize: 13,
    },
  });
}

function makeButtonStyles(colors: ColorScheme) {
  const base = secondaryButtonStyle(colors);
  return StyleSheet.create({
    button: {
      ...base,
      paddingVertical: 14,
      marginTop: 4,
      backgroundColor: colors.accent,
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    buttonPressed: {
      opacity: 0.88,
    },
    buttonText: {
      color: onAccentTextColor(colors),
      fontSize: 17,
      fontWeight: "800",
    },
  });
}

function makeToggleStyles(colors: ColorScheme) {
  const { accentTint } = getAccentTints(colors);
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: accentTint,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    copy: {
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    hint: {
      color: colors.text,
      opacity: 0.72,
      fontSize: 12,
      marginTop: 2,
    },
  });
}

function makeValidationStyles(colors: ColorScheme) {
  const { accentTintLight } = getAccentTints(colors);
  return StyleSheet.create({
    box: {
      backgroundColor: accentTintLight,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    item: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
