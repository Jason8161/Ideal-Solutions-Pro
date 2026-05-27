import * as Location from "expo-location";
import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  accentPanelStyle,
  getAccentTints,
  inputStyle,
  navCardStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";
import type { MapsAppPreference } from "@/lib/mapsPreference";
import { loadMapsPreference, MAPS_PREF_LABELS, saveMapsPreference } from "@/lib/mapsPreference";
import { formatAddressLine, openAddressInMaps, type AddressForMaps } from "@/lib/openAddressInMaps";

type SearchHit = {
  id: string;
  title: string;
  fields: AddressForMaps;
};

type Props = {
  address: AddressForMaps;
  onApplyAddress: (next: AddressForMaps) => void;
  /** Override accent fill opacity for the search field (default shared input 0.25). */
  inputFillOpacity?: number;
};

export function AddressSearchWithMaps({ address, onApplyAddress, inputFillOpacity }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors, inputFillOpacity), [colors, inputFillOpacity]);
  const placeholder = useMemo(() => placeholderTextColor(colors), [colors]);
  const [mapPref, setMapPref] = useState<MapsAppPreference>("auto");
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    void loadMapsPreference().then(setMapPref);
  }, []);

  const setPref = useCallback((p: MapsAppPreference) => {
    setMapPref(p);
    void saveMapsPreference(p);
  }, []);

  const runSearch = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Address search", "Map-based address lookup runs on the iOS or Android app.");
      return;
    }
    const q = searchText.trim();
    if (q.length < 3) {
      Alert.alert("Address search", "Type at least 3 characters (street, city, or business name).");
      return;
    }
    setSearching(true);
    setHits([]);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission", "Allow location access so the app can look up addresses on the map.");
        return;
      }
      const coords = await Location.geocodeAsync(q);
      if (!coords.length) {
        Alert.alert("No results", "Try a different search, or enter the address manually.");
        return;
      }
      const merged: SearchHit[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < Math.min(coords.length, 6); i++) {
        const c = coords[i];
        const rev = await Location.reverseGeocodeAsync({ latitude: c.latitude, longitude: c.longitude });
        const r = rev[0];
        if (!r) continue;
        const streetLine = [r.streetNumber, r.street].filter(Boolean).join(" ").trim();
        const fields: AddressForMaps = {
          street: streetLine || (r.name ?? "") || "",
          city: r.city ?? "",
          state: r.region ?? "",
          zip: r.postalCode ?? "",
        };
        const key = [fields.street, fields.city, fields.state, fields.zip].join("|").toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const displayTitle =
          (Platform.OS === "android" && r.formattedAddress) ||
          [fields.street, fields.city, fields.state, fields.zip].filter(Boolean).join(", ") ||
          q;
        merged.push({
          id: `${i}-${key}`,
          title: typeof displayTitle === "string" ? displayTitle : String(q),
          fields,
        });
      }
      if (!merged.length) {
        Alert.alert("No results", "Could not resolve that search to a street address. Try refining the query.");
        return;
      }
      setHits(merged);
    } catch (e) {
      Alert.alert("Address search", e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }, [searchText]);

  const onOpenMaps = useCallback(async () => {
    const line = formatAddressLine(address);
    if (!line) {
      Alert.alert("Maps", "Enter at least street, city, or ZIP before opening maps.");
      return;
    }
    try {
      await openAddressInMaps(address);
    } catch (e) {
      Alert.alert("Maps", e instanceof Error ? e.message : "Could not open maps.");
    }
  }, [address]);

  const prefOptions: MapsAppPreference[] = ["auto", "apple", "google"];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Address & maps</Text>
      <Text style={styles.muted}>Search fills street, city, state, and ZIP. Same maps choice as in Settings.</Text>

      <Text style={styles.subLabel}>Open addresses in</Text>
      <View style={styles.prefRow}>
        {prefOptions.map((p) => (
          <Pressable
            key={p}
            accessibilityLabel={MAPS_PREF_LABELS[p]}
            onPress={() => setPref(p)}
            style={({ pressed }) => [styles.prefChip, mapPref === p && styles.prefChipOn, pressed && styles.pressed]}
          >
            <Text style={[styles.prefChipText, mapPref === p && styles.prefChipTextOn]}>
              {p === "auto" ? "Auto" : p === "apple" ? "Apple" : "Google"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.subLabel}>Search map / geocoder</Text>
      <View style={styles.searchRow}>
        <VoiceTextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Street, city, or place name"
          placeholderTextColor={placeholder}
          style={styles.searchInput}
          onSubmitEditing={() => void runSearch()}
          returnKeyType="search"
        />
        <Pressable onPress={() => void runSearch()} style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed]} disabled={searching}>
          {searching ? <ActivityIndicator color={colors.text} /> : <Text style={styles.searchBtnText}>Search</Text>}
        </Pressable>
      </View>

      {hits.length > 0 ? (
        <View style={styles.hitList}>
          {hits.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.hitRow, pressed && styles.pressed]}
              onPress={() => {
                onApplyAddress(item.fields);
                setHits([]);
                setSearchText("");
              }}
            >
              <Text style={styles.hitTitle} numberOfLines={3}>
                {item.title}
              </Text>
              <Text style={styles.hitHint}>Tap to fill form</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable onPress={() => void onOpenMaps()} style={({ pressed }) => [styles.mapsBtn, pressed && styles.pressed]}>
        <Text style={styles.mapsBtnText}>Open current address in maps</Text>
      </Pressable>

      <Link href="/settings/maps-addresses" asChild>
        <Pressable style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}>
          <Text style={styles.settingsLinkText}>Maps & addresses in Settings</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function makeStyles(colors: ColorScheme, inputFillOpacity?: number) {
  const tints = getAccentTints(colors);
  const nav = navCardStyle(colors);
  const btn = secondaryButtonStyle(colors, tints);
  const fieldInput = inputStyle(colors, tints, inputFillOpacity);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    card: {
      ...nav,
      padding: 14,
      gap: 10,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    muted: {
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
    },
    subLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginTop: 4,
    },
    prefRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    prefChip: {
      ...btn,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    prefChipOn: {
      backgroundColor: tints.accentTintActive,
    },
    prefChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      opacity: 0.75,
    },
    prefChipTextOn: {
      color: colors.text,
      fontWeight: "800",
      opacity: 1,
    },
    searchRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    searchInput: {
      ...fieldInput,
      flex: 1,
      minWidth: 0,
      fontSize: 15,
    },
    searchBtn: {
      ...btn,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minWidth: 88,
      justifyContent: "center",
    },
    searchBtnText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 15,
    },
    hitList: {
      ...panel,
      maxHeight: 220,
      paddingHorizontal: 4,
    },
    hitRow: {
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexToRgba(colors.text, 0.2),
    },
    hitTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    hitHint: {
      color: tints.mutedText,
      fontSize: 12,
      marginTop: 4,
    },
    mapsBtn: {
      ...btn,
      marginTop: 4,
      paddingVertical: 14,
    },
    mapsBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    settingsLink: {
      paddingVertical: 6,
      alignSelf: "flex-start",
    },
    settingsLinkText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
      opacity: 0.85,
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
