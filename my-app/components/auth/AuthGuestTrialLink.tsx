import { Link, type Href } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import { ONBOARDING_TIER_TRIAL_HREF } from "@/lib/auth/authPaths";
import { getAccentTints, linkTextStyle, mutedTextColor, secondaryButtonStyle } from "@/components/themed/screenChrome";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

type Props = {
  /** When true, renders a full-width secondary button instead of a text link. */
  prominent?: boolean;
};

/** Routes reviewers and new users to the no-account guest trial onboarding flow. */
export function AuthGuestTrialLink({ prominent = false }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (prominent) {
    return (
      <Link href={ONBOARDING_TIER_TRIAL_HREF as Href} asChild>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Start 7-day free trial</Text>
          <Text style={styles.buttonHint}>No account required</Text>
        </Pressable>
      </Link>
    );
  }

  return (
    <View style={styles.linkWrap}>
      <Text style={styles.prompt}>Prefer to explore first?</Text>
      <Link href={ONBOARDING_TIER_TRIAL_HREF as Href} style={styles.link}>
        Start free trial without an account
      </Link>
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondaryBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    linkWrap: {
      marginTop: 16,
      alignItems: "center",
      gap: 6,
    },
    prompt: {
      color: mutedTextColor(colors), fontSize: 14,
      textAlign: "center",
    },
    link: {
      ...linkTextStyle(colors),
      textAlign: "center",
    },
    button: {
      ...secondaryBtn,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 8,
      alignItems: "center",
      gap: 4,
    },
    buttonPressed: {
      opacity: 0.88,
    },
    buttonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
      textAlign: "center",
    },
    buttonHint: {
      color: mutedTextColor(colors), fontSize: 14,
      textAlign: "center",
    },
  });
}
