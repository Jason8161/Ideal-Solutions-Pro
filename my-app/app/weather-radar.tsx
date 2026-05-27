import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { buildRainViewerRadarUrl } from "@/lib/weatherRadarUrl";

export default function WeatherRadarScreen() {
  const { colors } = useAppTheme();
  const themed = useMemo(() => makeStyles(colors), [colors]);
  const { lat, lon } = useLocalSearchParams<{ lat?: string; lon?: string }>();

  const latitude = lat != null ? Number(lat) : NaN;
  const longitude = lon != null ? Number(lon) : NaN;
  const coordsValid = Number.isFinite(latitude) && Number.isFinite(longitude);

  const uri = coordsValid ? buildRainViewerRadarUrl(latitude, longitude) : "";
  const [webError, setWebError] = useState(false);

  return (
    <SafeAreaView style={themed.safe} edges={["top", "left", "right"]}>
      <View style={themed.toolbar}>
        <Pressable
          onPress={() => router.back()}
          style={themed.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={themed.backText}>Back</Text>
        </Pressable>
        <Text style={themed.toolbarTitle} accessibilityRole="header">
          Live radar
        </Text>
        <View style={themed.toolbarSpacer} />
      </View>

      <Text style={themed.caption} accessibilityRole="text">
        RainViewer precipitation map for your coordinates. Data is provided by RainViewer, not
        Ideal Solutions Pro.
      </Text>

      {!coordsValid ? (
        <View style={themed.centered}>
          <Text style={themed.errorText}>Missing location for radar. Open Weather and try again.</Text>
        </View>
      ) : webError ? (
        <View style={themed.centered}>
          <Text style={themed.errorText}>Could not load the radar page.</Text>
          <Pressable
            onPress={() => setWebError(false)}
            style={themed.retryWrap}
            accessibilityRole="button"
            accessibilityLabel="Retry loading radar"
          >
            <Text style={themed.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          source={{ uri }}
          style={themed.webview}
          onError={() => setWebError(true)}
          onHttpError={() => setWebError(true)}
          startInLoadingState
          renderLoading={() => (
            <View style={themed.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          originWhitelist={["https://*", "http://*"]}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "transparent",
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 6,
      minWidth: 88,
    },
    backText: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.accent,
    },
    toolbarTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    toolbarSpacer: {
      minWidth: 88,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    webview: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    errorText: {
      fontSize: 16,
      color: colors.text,
      textAlign: "center",
      lineHeight: 22,
    },
    retryWrap: {
      marginTop: 16,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    retryText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accent,
    },
  });
}
