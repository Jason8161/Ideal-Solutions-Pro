import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { getTermsOfServiceText } from "@/lib/legal/termsOfService";
import type { CompanyProfile } from "@/lib/profileStorage";

type Props = {
  profile?: Partial<CompanyProfile> | null;
  compact?: boolean;
};

export function TermsOfServiceContent({ profile, compact = false }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors, compact), [colors, compact]);
  const text = useMemo(() => getTermsOfServiceText(profile), [profile]);

  return (
    <View style={styles.root}>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

function makeStyles(colors: ColorScheme, compact: boolean) {
  return StyleSheet.create({
    root: {
      gap: compact ? 8 : 12,
    },
    body: {
      fontSize: compact ? 13 : 14,
      lineHeight: compact ? 19 : 22,
      color: hexToRgba(colors.text, 0.92),
    },
  });
}
