import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View, Platform } from "react-native";

import { mutedTextColor, navCardStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  clearSubscriptionDevOverride,
  DEFAULT_SUBSCRIPTION_DEV_OVERRIDE,
  DEV_SIMULATED_TIER_OPTIONS,
  tierAvailabilityLabel,
  type SubscriptionDevOverride,
} from "@/lib/subscriptionDevOverride";
import { SUBSCRIPTION_TIER_ORDER, type SubscriptionTierId } from "@/lib/subscriptionPlans";

type SubscriptionDevControlsProps = {
  onChanged?: () => void;
};

export function SubscriptionDevControls({ onChanged }: SubscriptionDevControlsProps) {
  if (!__DEV__) return null;
  return <SubscriptionDevControlsInner onChanged={onChanged} />;
}

function SubscriptionDevControlsInner({ onChanged }: SubscriptionDevControlsProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { devOverride, setDevOverride, refresh, resetSubscriptionCache, storeTier, activeTier, accessSource } =
    useSubscription();
  const [draft, setDraft] = useState<SubscriptionDevOverride>(
    devOverride ?? DEFAULT_SUBSCRIPTION_DEV_OVERRIDE,
  );
  const [cacheResetBusy, setCacheResetBusy] = useState(false);
  const [cacheResetMessage, setCacheResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (devOverride) setDraft(devOverride);
  }, [devOverride]);

  const persist = useCallback(
    async (next: SubscriptionDevOverride) => {
      setDraft(next);
      await setDevOverride(next);
      await refresh();
      onChanged?.();
    },
    [setDevOverride, refresh, onChanged],
  );

  const availableSet = useMemo(() => new Set(draft.availableTiers), [draft.availableTiers]);

  function toggleTierAvailable(tierId: SubscriptionTierId, enabled: boolean) {
    const next = new Set(draft.availableTiers);
    if (enabled) next.add(tierId);
    else next.delete(tierId);
    if (next.size === 0) return;
    void persist({
      ...draft,
      availableTiers: SUBSCRIPTION_TIER_ORDER.filter((id) => next.has(id)),
    });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.badge}>Developer only</Text>
      <Text style={styles.title}>Simulate subscription for testing</Text>
      <Text style={styles.hint}>
        Does not charge the store. When simulation is off, RevenueCat and your profile tier apply as usual.
      </Text>

      <Text style={styles.devTierLine}>
        storeTier (RevenueCat): {storeTier ?? "null"} · activeTier: {activeTier} · source: {accessSource}
      </Text>

      <Pressable
        disabled={cacheResetBusy}
        onPress={() =>
          void (async () => {
            setCacheResetBusy(true);
            setCacheResetMessage(null);
            const result = await resetSubscriptionCache();
            await refresh();
            onChanged?.();
            setCacheResetMessage(result.ok ? "Cache cleared and purchases restored." : result.message ?? "Reset failed.");
            setCacheResetBusy(false);
          })()
        }
        style={({ pressed }) => [styles.resetBtn, styles.cacheResetBtn, pressed && styles.pressed]}
      >
        <Text style={styles.resetText}>
          {cacheResetBusy ? "Resetting subscription cache…" : "Reset Subscription Cache"}
        </Text>
      </Pressable>
      {cacheResetMessage ? <Text style={styles.hint}>{cacheResetMessage}</Text> : null}

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Enable simulation</Text>
        <Switch
          value={draft.simulationEnabled}
          onValueChange={(on) => void persist({ ...draft, simulationEnabled: on })}
          accessibilityLabel="Enable subscription simulation"
        />
      </View>

      {draft.simulationEnabled ? (
        <>
          <Text style={styles.sectionLabel}>Simulate active plan</Text>
          <View style={styles.chipRow}>
            {DEV_SIMULATED_TIER_OPTIONS.map((opt) => {
              const selected = draft.activeTierOverride === opt.id;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => void persist({ ...draft, activeTierOverride: opt.id })}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Plans shown on pickers</Text>
          {SUBSCRIPTION_TIER_ORDER.map((tierId) => (
            <View key={tierId} style={styles.row}>
              <Text style={styles.rowLabel}>{tierAvailabilityLabel(tierId)}</Text>
              <Switch
                value={availableSet.has(tierId)}
                onValueChange={(on) => toggleTierAvailable(tierId, on)}
                accessibilityLabel={`Show ${tierAvailabilityLabel(tierId)} on plan picker`}
              />
            </View>
          ))}

          <Pressable
            onPress={() =>
              void (async () => {
                await clearSubscriptionDevOverride();
                await persist({ ...DEFAULT_SUBSCRIPTION_DEV_OVERRIDE });
              })()
            }
            style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
          >
            <Text style={styles.resetText}>Reset simulation settings</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const cardBase = navCardStyle(colors);

  return StyleSheet.create({
    card: {
      ...cardBase,
      padding: 14,
      gap: 10,
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.45),
    },
    badge: {
      alignSelf: "flex-start",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: mutedTextColor(colors), backgroundColor: hexToRgba(colors.accent, 0.2),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      overflow: "hidden",
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    hint: {
      fontSize: 13,
      lineHeight: 19,
      color: mutedTextColor(colors)},
    devTierLine: {
      fontSize: 12,
      lineHeight: 18,
      color: mutedTextColor(colors),
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: mutedTextColor(colors), textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 4,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: placeholderTextColor(colors),
      backgroundColor: placeholderTextColor(colors),
    },
    chipSelected: {
      borderColor: hexToRgba(colors.accent, 0.8),
      backgroundColor: hexToRgba(colors.accent, 0.22),
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text},
    chipTextSelected: {
      fontWeight: "800",
      opacity: 1,
    },
    resetBtn: {
      marginTop: 6,
      paddingVertical: 10,
      alignItems: "center",
    },
    cacheResetBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hexToRgba(colors.accent, 0.55),
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    resetText: {
      fontSize: 14,
      fontWeight: "700",
      color: mutedTextColor(colors)},
    pressed: {
      opacity: 0.88,
    },
  });
}
