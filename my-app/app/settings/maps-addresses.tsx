import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { accentPanelStyle, getAccentTints } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import type { MapsAppPreference } from "@/lib/mapsPreference";
import { loadMapsPreference, MAPS_PREF_LABELS, saveMapsPreference } from "@/lib/mapsPreference";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";

const OPTIONS: MapsAppPreference[] = ["auto", "apple", "google"];

export default function MapsAddressesSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [pref, setPref] = useState<MapsAppPreference>("auto");

  useEffect(() => {
    void loadMapsPreference().then(setPref);
  }, []);

  const select = useCallback((p: MapsAppPreference) => {
    setPref(p);
    void saveMapsPreference(p);
  }, []);

  return (
    <StickyScrollScreen
      title="Maps & addresses"
      subtitle="Choose which maps app opens when you tap a customer address."
      backHref={settingsBackHref("maps-addresses")}
      backLabel={settingsBackLabel("maps-addresses")}
      scrollStyle={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.body}>
        When you open a customer address from Service calls or Estimates, the app uses this choice. Auto picks Apple Maps
        on iPhone and Google Maps on Android.
      </Text>

      <Text style={styles.section}>Maps app</Text>
      <View style={styles.row}>
        {OPTIONS.map((p) => (
          <Pressable
            key={p}
            onPress={() => select(p)}
            style={({ pressed }) => [styles.chip, pref === p && styles.chipOn, pressed && styles.pressed]}
          >
            <Text style={[styles.chipText, pref === p && styles.chipTextOn]}>{MAPS_PREF_LABELS[p]}</Text>
          </Pressable>
        ))}
      </View>

    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 20, paddingBottom: 40 },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: tints.mutedText,
      marginBottom: 20,
    },
    section: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    row: { gap: 10 },
    chip: {
      ...panel,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    chipOn: {
      backgroundColor: tints.accentTintActive,
    },
    chipText: { color: colors.text, fontSize: 15, fontWeight: "600", opacity: 0.88 },
    chipTextOn: { color: colors.text, fontWeight: "800", opacity: 1 },
    back: { marginTop: 24, paddingVertical: 10 },
    backText: { color: colors.text, fontSize: 16, fontWeight: "700", opacity: 0.9 },
    pressed: { opacity: 0.88 },
  });
}
