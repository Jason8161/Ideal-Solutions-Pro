import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AgreementCheckbox } from "@/components/legal/AgreementCheckbox";
import { navCardStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { LegalDocumentConstant } from "@/constants/legal";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";

type Props = {
  doc: LegalDocumentConstant;
  checked: boolean;
  viewed: boolean;
  onToggle: () => void;
  onView: () => void;
};

export function LegalDocumentCard({ doc, checked, viewed, onToggle, onView }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const canCheck = viewed;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{doc.title}</Text>
        <Pressable
          style={({ pressed }) => [styles.viewButton, pressed && styles.pressed]}
          onPress={onView}
          accessibilityRole="button"
          accessibilityLabel={`View ${doc.title}`}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>
        Version {doc.version} · Updated {doc.lastUpdated}
      </Text>
      {!viewed ? <Text style={styles.hint}>Open and scroll through the document to enable acceptance.</Text> : null}
      <AgreementCheckbox
        checked={checked}
        onToggle={onToggle}
        label={doc.checkboxLabel}
        disabled={!canCheck}
      />
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const nav = navCardStyle(colors);
  return StyleSheet.create({
    card: {
      ...nav,
      padding: 16,
      gap: 10,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    title: {
      flex: 1,
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    meta: {
      color: hexToRgba(colors.text, 0.7),
      fontSize: 12,
    },
    hint: {
      color: hexToRgba(colors.text, 0.75),
      fontSize: 13,
      lineHeight: 18,
    },
    viewButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: hexToRgba(colors.accent, 0.35),
    },
    viewButtonText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14,
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
