import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  accentPanelStyle,
  getAccentTints,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import { deferAfterInteractions } from "@/lib/deferNavigation";
import { supplierIntegrationIcon } from "@/lib/supplierIntegration/supplierIcon";
import type { QuickLaunchSupplier } from "@/lib/supplierIntegration/types";

type Props = {
  visible: boolean;
  suppliers: QuickLaunchSupplier[];
  defaultSupplierId: string | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onSetDefault: (id: string | null) => void;
  onOpenSettings: () => void;
};

export function SupplierFavoritesModal({
  visible,
  suppliers,
  defaultSupplierId,
  onClose,
  onToggleFavorite,
  onSetDefault,
  onOpenSettings,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Favorite suppliers</Text>
          <Text style={styles.subtitle}>Pin suppliers for quick launch. Set a default to open first.</Text>
          <View style={styles.list}>
            {suppliers.map((s) => (
              <View key={s.id} style={styles.row}>
                <View style={styles.rowIcon}>{supplierIntegrationIcon(s, colors.text, 24)}</View>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {s.name}
                </Text>
                <Pressable
                  onPress={() => onToggleFavorite(s.id)}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  accessibilityLabel={s.favorite ? "Unpin" : "Pin"}
                >
                  <Text style={styles.iconBtnText}>{s.favorite ? "★" : "☆"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onSetDefault(defaultSupplierId === s.id ? null : s.id)}
                  style={({ pressed }) => [
                    styles.defaultBtn,
                    defaultSupplierId === s.id && styles.defaultBtnActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.defaultBtnText}>
                    {defaultSupplierId === s.id ? "Default" : "Set default"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => {
              onClose();
              deferAfterInteractions(onOpenSettings);
            }}
            style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
          >
            <Text style={styles.settingsBtnText}>Supplier integration settings</Text>
          </Pressable>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);
  const secondary = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: hexToRgba("#000000", 0.55),
    },
    sheet: {
      ...panel,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
      maxHeight: "80%",
      borderWidth: 2,
      borderColor: hexToRgba(colors.accent, 0.4),
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 20,
      color: tints.mutedText,
    },
    list: {
      marginTop: 16,
      gap: 8,
      maxHeight: 320,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: tints.accentTintActive,
    },
    rowIcon: { width: 28, alignItems: "center" },
    rowTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    iconBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    iconBtnText: {
      fontSize: 18,
      color: colors.accent,
    },
    defaultBtn: {
      ...secondary,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    defaultBtnActive: {
      backgroundColor: hexToRgba(colors.accent, 0.35),
    },
    defaultBtnText: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.text,
    },
    settingsBtn: {
      marginTop: 16,
      ...secondary,
      paddingVertical: 12,
      alignItems: "center",
    },
    settingsBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    doneBtn: {
      marginTop: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    doneBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    pressed: { opacity: 0.88 },
  });
}
