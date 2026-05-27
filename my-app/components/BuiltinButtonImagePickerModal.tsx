import { Image } from "expo-image";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import { BUILTIN_HOME_BUTTON_IMAGES } from "@/lib/builtinHomeButtonImages";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Called when the user picks one of the bundled tiles. */
  onSelect: (imageModule: number, displayName: string) => void | Promise<void>;
  busy?: boolean;
};

const CATALOG_COLUMNS = 3;

export function BuiltinButtonImagePickerModal({ visible, title, onClose, onSelect, busy }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const horizontalPad = 20;
  const gap = 10;
  const catalogWidth = Math.min(windowWidth - horizontalPad * 2, 520);
  const cell = Math.floor((catalogWidth - gap * (CATALOG_COLUMNS - 1)) / CATALOG_COLUMNS);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable style={[styles.sheet, { width: catalogWidth + horizontalPad * 2 }]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetHint}>These images are included with the app — your photo library is not used.</Text>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.grid, { gap }]}>
              {BUILTIN_HOME_BUTTON_IMAGES.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.tile, { width: cell }]}
                  onPress={() => void onSelect(opt.image, opt.label)}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  <Image source={opt.image} style={[styles.thumb, { height: cell }]} contentFit="cover" accessibilityLabel={opt.label} />
                  <Text style={styles.tileLabel} numberOfLines={2}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={busy} activeOpacity={0.85}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    sheet: {
      maxHeight: "88%",
      backgroundColor: colors.background,
      borderRadius: 16,
      paddingTop: 18,
      paddingBottom: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      paddingHorizontal: 20,
      marginBottom: 6,
    },
    sheetHint: {
      color: colors.text,
      opacity: 0.72,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    scroll: {
      maxHeight: 420,
      paddingHorizontal: 20,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      paddingBottom: 8,
    },
    tile: {
      marginBottom: 4,
    },
    thumb: {
      width: "100%",
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.button,
    },
    tileLabel: {
      marginTop: 6,
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 14,
    },
    cancelButton: {
      marginTop: 4,
      alignSelf: "center",
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    cancelButtonText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
