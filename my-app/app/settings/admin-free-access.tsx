import { Link, Redirect, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { inputStyle, navCardStyle, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { isAppSubscriptionAdmin } from "@/lib/auth/subscriptionAdmin";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import {
  FREE_ACCESS_DURATION_OPTIONS,
  FREE_ACCESS_TIER_OPTIONS,
  expirationDateForPreset,
  formatFreeAccessExpiration,
  isFreeAccessOverrideActive,
  mapFreeAccessRow,
  searchFreeAccessOverrides,
  upsertFreeAccessOverride,
  type FreeAccessDurationPreset,
  type FreeAccessOverrideRow,
  type FreeAccessTierId,
} from "@/lib/subscription/freeAccessOverride";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getSubscriptionPlan } from "@/lib/subscriptionPlans";

export default function AdminFreeAccessScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session, profile } = useAuth();
  const { refresh } = useSubscription();

  const [adminOk, setAdminOk] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FreeAccessOverrideRow[]>([]);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [tier, setTier] = useState<FreeAccessTierId>("boss_man");
  const [duration, setDuration] = useState<FreeAccessDurationPreset>("90d");
  const [customExpiration, setCustomExpiration] = useState("");
  const [reason, setReason] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const ok = await isAppSubscriptionAdmin(session?.userId ?? "", profile?.email);
      if (!cancelled) setAdminOk(ok);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [session?.userId, profile?.email]);

  const runSearch = useCallback(async () => {
    if (!session?.userId) return;
    setSearching(true);
    try {
      const rows = await searchFreeAccessOverrides(session.userId, searchQuery);
      setResults(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed.";
      Alert.alert("Search", msg);
    } finally {
      setSearching(false);
    }
  }, [session?.userId, searchQuery]);

  const selectRow = useCallback((row: FreeAccessOverrideRow) => {
    setUserId(row.user_id);
    setEmail(row.email ?? "");
    setUsername(row.username ?? "");
    setTier(row.free_access_tier);
    setReason(row.free_access_reason ?? "");
    setEnabled(row.free_access_enabled);
    if (!row.free_access_expiration_date) {
      setDuration("lifetime");
    } else {
      setDuration("custom");
      setCustomExpiration(row.free_access_expiration_date.slice(0, 10));
    }
  }, []);

  const onSave = useCallback(async () => {
    if (!session?.userId) return;
    if (!userId.trim()) {
      Alert.alert("Grant access", "User ID is required.");
      return;
    }
    const customDate =
      duration === "custom" && customExpiration.trim()
        ? new Date(`${customExpiration.trim()}T23:59:59`)
        : null;
    const expiration = expirationDateForPreset(duration, customDate);
    setSaving(true);
    try {
      await upsertFreeAccessOverride({
        adminUserId: session.userId,
        userId: userId.trim(),
        email: email.trim() || undefined,
        username: username.trim() || undefined,
        enabled,
        tier,
        expirationDate: expiration,
        reason: reason.trim() || undefined,
      });
      Alert.alert("Saved", "Free access override saved.");
      await runSearch();
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      Alert.alert("Save", msg);
    } finally {
      setSaving(false);
    }
  }, [
    session?.userId,
    userId,
    email,
    username,
    enabled,
    tier,
    duration,
    customExpiration,
    reason,
    runSearch,
    refresh,
  ]);

  if (adminOk === null) {
    return (
      <StickyScrollScreen
        title="Admin free access"
        showBack
        backHref={"/settings/subscribe" as Href}
        backLabel="← Subscription"
      >
        <ActivityIndicator color={colors.text} />
      </StickyScrollScreen>
    );
  }

  if (!adminOk) {
    return <Redirect href={"/settings/subscribe" as Href} />;
  }

  return (
    <StickyScrollScreen
      title="Admin free access"
      subtitle="Grant complimentary tiers (Supabase)"
      backHref={settingsBackHref("subscribe")}
      backLabel={settingsBackLabel("subscribe")}
      contentContainerStyle={styles.content}
    >
      {!isSupabaseConfigured() ? (
        <View style={styles.card}>
          <Text style={styles.warn}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, apply migration
            002_free_access_overrides.sql, and seed app_subscription_admins.
          </Text>
          <Link href={"/settings/subscribe" as Href} asChild>
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85}>
              <Text style={styles.secondaryText}>← Subscription</Text>
            </TouchableOpacity>
          </Link>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Search users</Text>
            <Text style={styles.hint}>Email, username, or user ID (partial match).</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search…"
              placeholderTextColor={colors.text}
              style={[inputStyle(colors), styles.input]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => void runSearch()}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.primaryText}>Search</Text>
              )}
            </Pressable>
            {results.map((row) => {
              const mapped = mapFreeAccessRow(row);
              const plan = getSubscriptionPlan(mapped.tier);
              return (
                <Pressable
                  key={row.user_id}
                  onPress={() => selectRow(row)}
                  style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
                >
                  <Text style={styles.resultTitle}>{row.email || row.user_id}</Text>
                  <Text style={styles.hint}>
                    {plan.name} ·{" "}
                    {isFreeAccessOverrideActive(row) ? "active" : "inactive"} · expires{" "}
                    {formatFreeAccessExpiration(
                      row.free_access_expiration_date
                        ? new Date(row.free_access_expiration_date)
                        : null,
                    )}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Grant / edit override</Text>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              value={userId}
              onChangeText={setUserId}
              placeholder="local_… or auth user id"
              placeholderTextColor={colors.text}
              style={[inputStyle(colors), styles.input]}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor={colors.text}
              style={[inputStyle(colors), styles.input]}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.label}>Username (optional)</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Searchable display name"
              placeholderTextColor={colors.text}
              style={[inputStyle(colors), styles.input]}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Tier</Text>
            <View style={styles.chipRow}>
              {FREE_ACCESS_TIER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setTier(opt.id)}
                  style={[styles.chip, tier === opt.id && styles.chipSelected]}
                >
                  <Text style={styles.chipText}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.chipRow}>
              {FREE_ACCESS_DURATION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setDuration(opt.id)}
                  style={[styles.chip, duration === opt.id && styles.chipSelected]}
                >
                  <Text style={styles.chipText}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            {duration === "custom" ? (
              <>
                <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
                <TextInput
                  value={customExpiration}
                  onChangeText={setCustomExpiration}
                  placeholder="2026-12-31"
                  placeholderTextColor={colors.text}
                  style={[inputStyle(colors), styles.input]}
                  autoCapitalize="none"
                />
              </>
            ) : null}
            <Text style={styles.label}>Reason</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Partner, promo, support…"
              placeholderTextColor={colors.text}
              style={[inputStyle(colors), styles.input]}
            />
            <Pressable
              onPress={() => setEnabled((v) => !v)}
              style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}
            >
              <Text style={styles.label}>Enabled</Text>
              <Text style={styles.hint}>{enabled ? "Yes" : "No (revoke)"}</Text>
            </Pressable>
            <Pressable
              onPress={() => void onSave()}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.primaryText}>Save override</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  const nav = navCardStyle(colors);
  const secondary = secondaryButtonStyle(colors);
  return StyleSheet.create({
    content: { padding: 24, paddingBottom: 40, gap: 16 },
    card: { ...nav, padding: 16, gap: 10 },
    cardTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
    label: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 },
    hint: { color: colors.text, opacity: 0.72, fontSize: 13, lineHeight: 18 },
    warn: { color: colors.accent, fontSize: 14, lineHeight: 20 },
    input: { marginTop: 4 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
    chip: {
      borderWidth: 1,
      borderColor: colors.text,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      opacity: 0.85,
    },
    chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent, opacity: 1 },
    chipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    primaryText: { color: colors.background, fontWeight: "800", fontSize: 16 },
    secondaryBtn: { ...secondary, marginTop: 12, alignItems: "center", paddingVertical: 12 },
    secondaryText: { color: colors.text, fontWeight: "700" },
    resultRow: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.text },
    resultTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    toggleRow: { paddingVertical: 8 },
    pressed: { opacity: 0.85 },
  });
}
