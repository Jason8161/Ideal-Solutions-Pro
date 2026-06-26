import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { navCardStyle, COLORS, type ResponsiveTypography } from "@/components/themed/screenChrome";
import { useResponsiveTypography } from "@/lib/layout/responsiveTypography";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

type EmployeeAccessCardProps = {
  selected: boolean;
  onPress: () => void;
  colors: ColorScheme;
  compact?: boolean;
};

export function EmployeeAccessCard({ selected, onPress, colors, compact = false }: EmployeeAccessCardProps) {
  const typo = useResponsiveTypography();
  const styles = useMemo(() => makeStyles(typo), [typo.isTablet]);
  const borderColor = selected ? COLORS.textPrimary : COLORS.textDisabled;
  const cardPanel = navCardStyle(colors, typo.isTablet);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel="Employee Access, invitation code from employer"
      style={({ pressed }) => [
        styles.card,
        cardPanel,
        {
          borderColor,
          borderWidth: selected ? 2 : 1,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.name, { color: COLORS.textPrimary }]}>Employee Access</Text>
        {selected ? <MaterialCommunityIcons name="check-circle" size={typo.scaleSpacing(22)} color={COLORS.textPrimary} /> : null}
      </View>
      <Text style={[styles.price, { color: COLORS.textPrimary }]}>No purchase required</Text>
      {!compact ? (
        <Text style={[styles.tagline, { color: COLORS.textSecondary }]}>
          Enter the invitation code sent by your employer.
        </Text>
      ) : null}

      <View style={styles.featureList}>
        {[
          "7-day guest trial on this device",
          "Join your crew with an invite code",
          "No account until your code is verified",
        ].map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <MaterialCommunityIcons name="check" size={typo.hintFontSize} color={COLORS.textPrimary} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: COLORS.textSecondary }]}>{feature}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function makeStyles(typo: ResponsiveTypography) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      padding: typo.cardPadding,
      gap: typo.scaleSpacing(8),
    },
    pressed: {
      opacity: 0.9,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: typo.scaleSpacing(8),
    },
    name: {
      fontSize: typo.cardTitleFontSize,
      fontWeight: "800",
      flex: 1,
      lineHeight: typo.scaleLineHeight(Math.round(typo.cardTitleFontSize * 1.3)),
    },
    price: {
      fontSize: typo.sectionHeaderFontSize,
      fontWeight: "800",
      lineHeight: typo.scaleLineHeight(Math.round(typo.sectionHeaderFontSize * 1.25)),
    },
    tagline: {
      fontSize: typo.bodyFontSize,
      lineHeight: typo.bodyLineHeight,
      fontWeight: typo.bodyFontWeight,
    },
    featureList: {
      marginTop: typo.scaleSpacing(4),
      gap: typo.scaleSpacing(6),
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: typo.scaleSpacing(6),
    },
    featureIcon: {
      marginTop: typo.scaleSpacing(2),
    },
    featureText: {
      flex: 1,
      fontSize: typo.hintFontSize,
      lineHeight: typo.hintLineHeight,
      fontWeight: typo.hintFontWeight,
    },
  });
}
