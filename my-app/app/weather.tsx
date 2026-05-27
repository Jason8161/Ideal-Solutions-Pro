import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { HOME_FALLBACK_HREF, ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  useWeatherForecast,
  type DailyForecastDay,
  type HourlyForecastSlot,
} from "@/hooks/useWeatherForecast";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

function makeHourlyChipStyles(colors: ColorScheme) {
  const secondaryButtonBase = secondaryButtonStyle(colors);
  return StyleSheet.create({
    wrap: {
      width: 92,
      paddingVertical: 12,
      paddingHorizontal: 10,
      marginRight: 10,
      borderRadius: 12,
      ...secondaryButtonBase,
    },
    hour: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    icon: {
      marginBottom: 4,
    },
    temp: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
    },
    precip: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.border,
      marginTop: 4,
      textAlign: "center",
    },
    precipPlaceholder: {
      fontSize: 10,
      marginTop: 4,
    },
  });
}

function makeRowStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: hexToRgba(colors.text, 0.12),
    },
    rowToday: {
      backgroundColor: tints.accentTint,
    },
    dayLabel: {
      width: 72,
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    dayLabelToday: {
      color: colors.accent,
    },
    icon: {
      width: 36,
    },
    conditionBlock: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 8,
    },
    condition: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    precip: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.border,
      marginTop: 2,
    },
    temps: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      minWidth: 72,
      textAlign: "right",
    },
  });
}

function HourlyChip({
  slot,
  colors,
}: {
  slot: HourlyForecastSlot;
  colors: ColorScheme;
}) {
  const chip = useMemo(() => makeHourlyChipStyles(colors), [colors]);
  const precipHint =
    slot.precipChancePercent != null && slot.precipChancePercent > 0
      ? `${slot.precipChancePercent}% rain`
      : undefined;

  return (
    <View
      style={chip.wrap}
      accessibilityLabel={`${slot.hourLabel}, ${slot.temperatureF} degrees, ${slot.condition}${
        precipHint ? `, ${precipHint}` : ""
      }`}
    >
      <Text style={chip.hour}>{slot.hourLabel}</Text>
      <Ionicons name={slot.icon} size={26} color={colors.accent} style={chip.icon} />
      <Text style={chip.temp}>{slot.temperatureF}°</Text>
      {precipHint ? (
        <Text style={chip.precip} numberOfLines={1}>
          {precipHint}
        </Text>
      ) : (
        <Text style={chip.precipPlaceholder}> </Text>
      )}
    </View>
  );
}

function DailyRow({
  day,
  colors,
  isToday,
}: {
  day: DailyForecastDay;
  colors: ColorScheme;
  isToday: boolean;
}) {
  const rowStyles = useMemo(() => makeRowStyles(colors), [colors]);

  return (
    <View style={[rowStyles.row, isToday && rowStyles.rowToday]}>
      <Text style={[rowStyles.dayLabel, isToday && rowStyles.dayLabelToday]}>{day.dayLabel}</Text>
      <Ionicons name={day.icon} size={28} color={colors.accent} style={rowStyles.icon} />
      <View style={rowStyles.conditionBlock}>
        <Text style={rowStyles.condition} numberOfLines={1}>
          {day.condition}
        </Text>
        {day.precipChancePercent != null && day.precipChancePercent > 0 ? (
          <Text style={rowStyles.precip}>{day.precipChancePercent}% rain</Text>
        ) : null}
      </View>
      <Text style={rowStyles.temps}>
        {day.highF}° / {day.lowF}°
      </Text>
    </View>
  );
}

export default function WeatherScreen() {
  const { colors } = useAppTheme();
  const themed = useMemo(() => makeStyles(colors), [colors]);
  const { state, refresh } = useWeatherForecast();

  const openRadar = () => {
    if (state.status !== "ready") return;
    router.push(
      `/weather-radar?lat=${encodeURIComponent(String(state.data.latitude))}&lon=${encodeURIComponent(String(state.data.longitude))}`,
    );
  };

  const locationSubtitle =
    state.status === "ready" ? state.data.locationLabel : "Local forecast for your job area.";

  return (
    <ScStickyScroll title="Weather" subtitle={locationSubtitle} fallbackHref={HOME_FALLBACK_HREF}>
      {state.status === "loading" ? (
        <View style={themed.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={themed.hint}>Loading forecast…</Text>
        </View>
      ) : null}

      {state.status === "error" ? (
        <View style={themed.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.border} />
          <Text style={themed.errorText}>{state.message}</Text>
          <Pressable onPress={() => void refresh()} style={themed.retryButton} accessibilityRole="button">
            <Text style={themed.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {state.status === "ready" ? (
        <>
          <View style={themed.currentCard}>
            <View style={themed.currentMain}>
              <Ionicons name={state.data.icon} size={56} color={colors.accent} />
              <Text style={themed.currentTemp}>{state.data.temperatureF}°</Text>
            </View>
            <Text style={themed.currentCondition}>{state.data.condition}</Text>
            <Text style={themed.currentRange}>
              Today H {state.data.highF}° · L {state.data.lowF}°
            </Text>
            <Pressable
              onPress={() => void refresh()}
              hitSlop={8}
              style={themed.refreshRow}
              accessibilityRole="button"
              accessibilityLabel="Refresh weather"
            >
              <Ionicons name="refresh" size={18} color={colors.border} />
              <Text style={themed.refreshLabel}>Refresh</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={openRadar}
            style={themed.radarButton}
            accessibilityRole="button"
            accessibilityLabel="Live radar"
            accessibilityHint="Opens RainViewer precipitation map for your location"
          >
            <Ionicons name="pulse-outline" size={22} color={colors.accent} />
            <View style={themed.radarButtonTextBlock}>
              <Text style={themed.radarButtonTitle}>Live radar</Text>
              <Text style={themed.radarButtonSub}>RainViewer · no API key</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </Pressable>

          <Text style={themed.sectionTitle}>Next 24 hours</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={themed.hourlyScroll}
            contentContainerStyle={themed.hourlyScrollContent}
            accessibilityRole="list"
            accessibilityLabel="Hourly forecast, scroll horizontally for more hours"
          >
            {state.data.hourly.map((slot) => (
              <HourlyChip key={slot.timeIso} slot={slot} colors={colors} />
            ))}
          </ScrollView>

          <Text style={themed.sectionTitle}>7-day forecast</Text>
          <View style={themed.dailyList}>
            {state.data.daily.map((day, index) => (
              <DailyRow key={day.date} day={day} colors={colors} isToday={index === 0} />
            ))}
          </View>
        </>
      ) : null}
    </ScStickyScroll>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondaryButtonBase = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      flexGrow: 1,
      padding: 20,
      paddingBottom: 16,
    },
    backLink: {
      alignSelf: "flex-start",
      marginBottom: 8,
      paddingVertical: 6,
    },
    backLinkText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: "700",
    },
    headerBlock: {
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.border,
      marginTop: 4,
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingVertical: 40,
    },
    hint: {
      fontSize: 16,
      color: colors.text,
      opacity: 0.75,
    },
    errorText: {
      fontSize: 16,
      color: colors.text,
      textAlign: "center",
      opacity: 0.85,
      lineHeight: 22,
      paddingHorizontal: 12,
    },
    retryButton: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    retryText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accent,
    },
    currentCard: {
      ...secondaryButtonBase,
      borderRadius: 12,
      padding: 20,
      alignItems: "center",
      marginBottom: 24,
    },
    currentMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    currentTemp: {
      fontSize: 48,
      fontWeight: "800",
      color: colors.text,
    },
    currentCondition: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginTop: 8,
    },
    currentRange: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.border,
      marginTop: 4,
    },
    refreshRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 14,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    refreshLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.border,
    },
    radarButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 20,
      borderRadius: 12,
      ...secondaryButtonBase,
    },
    radarButtonTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    radarButtonTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
    },
    radarButtonSub: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.border,
      marginTop: 2,
    },
    hourlyScroll: {
      marginBottom: 20,
      flexGrow: 0,
    },
    hourlyScrollContent: {
      paddingRight: 8,
      paddingVertical: 2,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.border,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    dailyList: {
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      backgroundColor: colors.background,
    },
  });
}
