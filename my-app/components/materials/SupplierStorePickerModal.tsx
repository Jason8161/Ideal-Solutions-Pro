import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
  searchTerm: string;
  itemCount: number;
  onClose: () => void;
  onSelect: (id: string) => void;
  onOpenSettings: () => void;
};

export function SupplierStorePickerModal({
  visible,
  suppliers,
  searchTerm,
  itemCount,
  onClose,
  onSelect,
  onOpenSettings,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const subtitle = useMemo(() => {
    if (searchTerm.length === 0) {
      return "Choose a store to open. Add a search term above to pass it to the app.";
    }
    if (itemCount > 1) {
      return `Search ${itemCount} items in the store you pick. Terms are combined for the supplier search box.`;
    }
    return `Search for "${searchTerm}" in the store you pick.`;
  }, [itemCount, searchTerm]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Choose store</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {suppliers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No suppliers enabled. Add stores under Settings → Material search suppliers or Enable Supplier Integrations.
              </Text>
              <Pressable
                onPress={() => {
                  onClose();
                  deferAfterInteractions(onOpenSettings);
                }}
                style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
              >
                <Text style={styles.settingsBtnText}>Material search suppliers</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {suppliers.map((supplier) => (
                <Pressable
                  key={supplier.id}
                  onPress={() => onSelect(supplier.id)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Search in ${supplier.name}`}
                >
                  <View style={styles.rowIcon}>{supplierIntegrationIcon(supplier, colors.text, 28)}</View>
                  <View style={styles.rowTextBlock}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {supplier.name}
                      {supplier.favorite ? " ★" : ""}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {supplier.installed ? "App installed" : "Opens website if app missing"}
                    </Text>
                  </View>
                  <Text style={styles.rowChevron} accessible={false}>
                    ›
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
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
      maxHeight: 360,
    },
    listContent: {
      gap: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: tints.accentTintActive,
    },
    rowIcon: {
      width: 32,
      alignItems: "center",
    },
    rowTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    rowMeta: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "600",
      color: tints.mutedText,
    },
    rowChevron: {
      fontSize: 28,
      fontWeight: "300",
      color: colors.text,
      lineHeight: 30,
    },
    emptyBox: {
      marginTop: 16,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 20,
      color: tints.mutedText,
    },
    settingsBtn: {
      ...secondary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignSelf: "flex-start",
      backgroundColor: tints.accentTintActive,
    },
    settingsBtnText: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
    },
    cancelBtn: {
      marginTop: 16,
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    pressed: { opacity: 0.88 },
  });
}
