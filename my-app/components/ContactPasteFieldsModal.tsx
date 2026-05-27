import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  availableJobContactPasteFields,
  pickJobContactPasteFields,
  type JobContactPasteFieldKey,
  type JobContactPasteFields,
} from "@/lib/customerContactPick";
import { getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";

const FIELD_LABELS: Record<JobContactPasteFieldKey, string> = {
  name: "Name",
  phone: "Phone",
  email: "Email",
  address: "Address",
};

type Props = {
  visible: boolean;
  mapped: JobContactPasteFields | null;
  onClose: () => void;
  onConfirm: (picked: JobContactPasteFields) => void;
};

export function ContactPasteFieldsModal({ visible, mapped, onClose, onConfirm }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tints = useMemo(() => getAccentTints(colors), [colors]);
  const [selected, setSelected] = useState<Set<JobContactPasteFieldKey>>(new Set());

  const available = useMemo(
    () => (mapped ? availableJobContactPasteFields(mapped) : []),
    [mapped],
  );

  useEffect(() => {
    if (!visible || !mapped) return;
    setSelected(new Set(availableJobContactPasteFields(mapped)));
  }, [visible, mapped]);

  const toggle = useCallback((key: JobContactPasteFieldKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const confirm = useCallback(() => {
    if (!mapped) return;
    onConfirm(pickJobContactPasteFields(mapped, [...selected]));
    onClose();
  }, [mapped, onClose, onConfirm, selected]);

  if (!mapped) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Choose fields to paste</Text>
          <Text style={styles.subtitle}>Select which contact details to add to this job.</Text>
          {available.map((key) => {
            const on = selected.has(key);
            const preview = mapped[key].trim();
            return (
              <Pressable
                key={key}
                onPress={() => toggle(key)}
                style={({ pressed }) => [
                  styles.row,
                  secondaryButtonStyle(colors, tints),
                  on && styles.rowOn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${FIELD_LABELS[key]}: ${preview}`}
              >
                <Text style={styles.check}>{on ? "✓" : "○"}</Text>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{FIELD_LABELS[key]}</Text>
                  <Text style={styles.rowPreview} numberOfLines={2}>
                    {preview}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.btn,
                secondaryButtonStyle(colors, tints),
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              disabled={selected.size === 0}
              style={({ pressed }) => [
                styles.btn,
                secondaryButtonStyle(colors, tints),
                pressed && styles.pressed,
                selected.size === 0 && styles.disabled,
              ]}
            >
              <Text style={styles.btnText}>Paste selected</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  const muted = getAccentTints(colors).mutedText;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      borderRadius: 16,
      padding: 18,
      gap: 10,
      backgroundColor: colors.background,
      maxWidth: 420,
      width: "100%",
      alignSelf: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: muted,
      marginBottom: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 12,
      borderRadius: 12,
    },
    rowOn: {
      opacity: 1,
    },
    check: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      width: 22,
    },
    rowText: { flex: 1, gap: 2 },
    rowLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    rowPreview: {
      fontSize: 14,
      color: muted,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    btn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    btnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    pressed: { opacity: 0.88 },
    disabled: { opacity: 0.5 },
  });
}
