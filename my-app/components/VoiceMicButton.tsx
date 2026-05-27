import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { useVoiceToText } from "@/lib/useVoiceToText";

type VoiceHook = Pick<
  ReturnType<typeof useVoiceToText>,
  "available" | "listening" | "error" | "toggle" | "clearError"
>;

type Props = VoiceHook & {
  /** Tighter layout when stacked beside a single-line field */
  compact?: boolean;
};

/**
 * Mic accessory for any controlled text field. Does not steal focus from the keyboard.
 */
export function VoiceMicButton({
  available,
  listening,
  error,
  toggle,
  clearError,
  compact,
}: Props) {
  const { colors } = useAppTheme();

  if (!available) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Pressable
        onPress={() => void toggle()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: listening ? colors.accent : "rgba(255,255,255,0.12)" },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={listening ? "Stop voice input" : "Start voice input"}
        accessibilityState={{ selected: listening }}
        hitSlop={8}
      >
        {listening ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Ionicons name="mic" size={compact ? 20 : 22} color={colors.text} />
        )}
      </Pressable>
      {error ? (
        <Pressable onPress={clearError} accessibilityRole="button" accessibilityLabel="Dismiss error">
          <Text style={[styles.error, { color: colors.text }]} numberOfLines={2}>
            {error}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "flex-start",
    marginLeft: 8,
    maxWidth: 120,
  },
  wrapCompact: {
    marginLeft: 6,
    maxWidth: 100,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  error: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.85,
    textAlign: "center",
  },
});
