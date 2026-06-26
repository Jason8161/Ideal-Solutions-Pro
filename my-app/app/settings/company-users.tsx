import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, inputStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createCompanyInvite,
  fetchCompanyUsers,
  hasCompanyUserApi,
  updateCompanyUserRole,
  updateCompanyUserStatus,
} from "@/lib/company/companyUserApi";
import {
  INVITABLE_ROLE_IDS,
  canManageCompanyUsers,
  companyRoleLabel,
} from "@/lib/permissions/companyRoles";
import {
  canAddCompanyUser,
  companyUserLimitLabel,
  maxCompanyUsersForTier,
} from "@/lib/permissions/userLimits";

export default function CompanyUsersScreen() {
  const { scStyles } = useBossManChrome();
  const { colors } = useAppTheme();
  const fieldInput = useMemo(() => inputStyle(colors, getAccentTints(colors)), [colors]);
  const placeholderColor = useMemo(() => "#888888", []);
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<
    Awaited<ReturnType<typeof fetchCompanyUsers>>["users"]
  >([]);
  const [tier, setTier] = useState(profile?.subscriptionTier ?? "side_hustle");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof INVITABLE_ROLE_IDS)[number]>("employee");
  const [busy, setBusy] = useState(false);

  const roleId = profile?.roleId;
  const canManage = roleId ? canManageCompanyUsers(roleId) : false;
  const apiReady = hasCompanyUserApi();

  const refresh = useCallback(async () => {
    if (!session?.token || !apiReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCompanyUsers(session.token);
      setUsers(data.users);
      setTier(data.subscriptionTier);
    } catch (e) {
      Alert.alert("Could not load users", e instanceof Error ? e.message : "Try again.");
    } finally {
      setLoading(false);
    }
  }, [apiReady, session?.token]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const activeCount = useMemo(
    () => users.filter((u) => u.status === "active").length,
    [users],
  );
  const atLimit = !canAddCompanyUser(activeCount, tier);

  const onInvite = useCallback(async () => {
    if (!session?.token) return;
    const email = inviteEmail.trim();
    if (!email.includes("@")) {
      Alert.alert("Email", "Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const result = await createCompanyInvite(session.token, { email, roleId: inviteRole });
      setInviteEmail("");
      Alert.alert(
        "Invite created",
        `Share this link:\n${result.inviteLink}\n\nCode: ${result.invite.code}`,
      );
      await refresh();
    } catch (e) {
      Alert.alert("Invite failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [inviteEmail, inviteRole, refresh, session?.token]);

  if (!canManage) {
    return (
      <ScStickyScroll title="Company users" subtitle="Team access">
        <Text style={scStyles.emptyText}>Only Owner and Admin can manage company users.</Text>
      </ScStickyScroll>
    );
  }

  if (!apiReady) {
    return (
      <ScStickyScroll title="Company users" subtitle="Team access">
        <Text style={scStyles.emptyText}>
          Set EXPO_PUBLIC_PRICING_API_URL to your pricing-backend URL to enable cloud user management.
        </Text>
      </ScStickyScroll>
    );
  }

  return (
    <ScStickyScroll title="Company users" subtitle={companyUserLimitLabel(tier)}>
      <Text style={[scStyles.subtitle, { marginBottom: 16 }]}>
        {activeCount} of {maxCompanyUsersForTier(tier)} seats used
        {atLimit ? " ΓÇö upgrade to add more users." : ""}
      </Text>

      <Text style={scStyles.cardTitle}>Invite user</Text>
      <VoiceTextInput
        value={inviteEmail}
        onChangeText={setInviteEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="email@company.com"
        placeholderTextColor={placeholderColor}
        style={[fieldInput, { marginBottom: 12 }]}
      />
      <View style={scStyles.chipRow}>
        {INVITABLE_ROLE_IDS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setInviteRole(id)}
            style={[scStyles.chip, inviteRole === id && scStyles.chipActive]}
          >
            <Text style={[scStyles.chipText, inviteRole === id && scStyles.chipTextActive]}>
              {companyRoleLabel(id)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [
          scStyles.primaryCta,
          pressed && { opacity: 0.9 },
          (busy || atLimit) && { opacity: 0.5 },
        ]}
        disabled={busy || atLimit}
        onPress={() => void onInvite()}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={scStyles.primaryCtaText}>Send invite</Text>
        )}
      </Pressable>

      <Text style={[scStyles.cardTitle, { marginTop: 24 }]}>Team</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : users.length === 0 ? (
        <Text style={scStyles.emptyText}>No users yet.</Text>
      ) : (
        users.map((user) => (
          <View key={user.userId} style={scStyles.card}>
            <Text style={scStyles.cardTitle}>{user.fullName || user.email}</Text>
            <Text style={scStyles.cardMeta}>
              {user.email} ┬╖ {companyRoleLabel(user.roleId)} ┬╖ {user.status}
            </Text>
            {user.roleId !== "owner" && session?.userId !== user.userId ? (
              <View style={[scStyles.chipRow, { marginTop: 8, marginBottom: 0 }]}>
                {INVITABLE_ROLE_IDS.filter((id) => id !== user.roleId).map((id) => (
                  <Pressable
                    key={id}
                    style={scStyles.chip}
                    onPress={() => {
                      if (!session?.token) return;
                      void updateCompanyUserRole(session.token, user.userId, id).then(refresh);
                    }}
                  >
                    <Text style={scStyles.chipText}>Make {companyRoleLabel(id)}</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={scStyles.chip}
                  onPress={() => {
                    if (!session?.token) return;
                    const next = user.status === "active" ? "disabled" : "active";
                    void updateCompanyUserStatus(session.token, user.userId, next).then(refresh);
                  }}
                >
                  <Text style={scStyles.chipText}>
                    {user.status === "active" ? "Disable" : "Enable"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScStickyScroll>
  );
}
