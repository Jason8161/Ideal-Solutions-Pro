import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { ImmersiveTextInput } from "@/components/ImmersiveTextInput";
import { useAppTheme } from "@/context/ThemeContext";
import { openChatGPTWithPrompt } from "@/lib/aiAssistant";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";

type Props = {
  title: string;
  subtitle: string;
  backHref: string;
  children: ReactNode;
  onSubmit: () => string | null;
  submitLabel?: string;
};

export function AiToolFormScreen({
  title,
  subtitle,
  backHref,
  children,
  onSubmit,
  submitLabel = "Generate & open ChatGPT",
}: Props) {
  const { scStyles } = useBossManChrome();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(), []);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const prompt = onSubmit();
    if (!prompt?.trim()) {
      Alert.alert("Missing info", "Fill in at least one field before generating a prompt.");
      return;
    }

    setBusy(true);
    try {
      await openChatGPTWithPrompt(prompt);
      Alert.alert("Prompt copied", "Paste into ChatGPT.");
    } catch {
      Alert.alert("Could not open ChatGPT", "Your prompt was copied — open ChatGPT manually and paste.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScStickyScroll title={title} subtitle={subtitle} backHref={backHref}>
      <View style={styles.form}>{children}</View>
      <Pressable
        style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, busy && { opacity: 0.85 }]}
        onPress={() => void handleSubmit()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
      >
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={scStyles.primaryCtaText}>{submitLabel}</Text>
        )}
      </Pressable>
    </ScStickyScroll>
  );
}

export function AiFormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "number-pad";
}) {
  const { colors } = useAppTheme();
  const fieldStyle = useMemo(() => inputStyle(colors), [colors]);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 6, fontSize: 15 }}>{label}</Text>
      <ImmersiveTextInput
        containerStyle={{ width: "100%" }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor(colors)}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[fieldStyle, multiline && { minHeight: 96, textAlignVertical: "top" }]}
      />
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    form: {
      marginBottom: 20,
    },
  });
}
