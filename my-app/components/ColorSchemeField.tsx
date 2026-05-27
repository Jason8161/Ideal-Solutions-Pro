import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { isValidHex, normalizeHex } from "@/lib/colorSchemeStorage";
import { VoiceTextInput } from "@/components/VoiceTextInput";

const PRESETS = [
  "#0C1424",
  "#102C55",
  "#1D4E89",
  "#1E90FF",
  "#FF8C00",
  "#FFFFFF",
  "#000000",
  "#3D5A8A",
  "#94A8D6",
  "#E8EEFF",
];

type Props = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  textColor: string;
  borderColor: string;
  fieldBackground: string;
  /** Border for selected preset swatch; defaults to orange preset. */
  selectionColor?: string;
};

export function ColorSchemeField({
  label,
  value,
  onChange,
  textColor,
  borderColor,
  fieldBackground,
  selectionColor = "#FF8C00",
}: Props) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  const commit = useCallback(
    (raw: string) => {
      const normalized = normalizeHex(raw);
      if (!normalized) {
        setInvalid(true);
        return;
      }
      setInvalid(false);
      setDraft(normalized);
      onChange(normalized);
    },
    [onChange],
  );

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: value, borderColor }]} />
        <VoiceTextInput
          value={draft}
          onChangeText={(t) => {
            setDraft(t);
            if (invalid) setInvalid(false);
          }}
          onBlur={() => commit(draft)}
          onSubmitEditing={() => commit(draft)}
          placeholder="#RRGGBB"
          placeholderTextColor="#6b7fa8"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          style={[
            styles.input,
            {
              color: textColor,
              borderColor: invalid ? "#f87171" : borderColor,
              backgroundColor: fieldBackground,
            },
          ]}
        />
      </View>
      {invalid ? <Text style={styles.error}>Use a 6-digit hex color, e.g. #1D4E89</Text> : null}
      <View style={styles.presets}>
        {PRESETS.map((hex) => (
          <Pressable
            key={`${label}-${hex}`}
            onPress={() => commit(hex)}
            style={[
              styles.preset,
              { backgroundColor: hex, borderColor },
              value === hex && [styles.presetSelected, { borderColor: selectionColor }],
            ]}
            accessibilityLabel={`Set ${label} to ${hex}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    marginTop: 6,
    color: "#fecaca",
    fontSize: 13,
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  preset: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetSelected: {
    borderWidth: 3,
  },
});
