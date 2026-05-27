import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { StickyScrollScreen } from "@/components/serviceCalls/screenChrome";
import { navCardStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";
import {
  companyAiPolicyLabel,
  loadCompanyAiPolicy,
  saveCompanyAiPolicy,
  type CompanyAiPolicyMode,
} from "@/lib/companyAiPolicy";
import { ownerSubscriptionIncludesCrewAi } from "@/lib/employeeAi/companyAiIncluded";
import { getEmployeeAiPlan } from "@/lib/employeeAi/tiers";
import { resetAiUsage } from "@/lib/employeeAi/usageStorage";
import { useAiAccess, saveDevEmployeeTier } from "@/lib/employeeAi/useAiAccess";
import {
  clearEmployeeSession,
  loadEmployeeSession,
  saveEmployeeSession,
  type EmployeeSession,
} from "@/lib/employeeSession";
import {
  loadAiAssistantToolsEnabled,
  saveAiAssistantToolsEnabled,
} from "@/lib/aiAssistant";
import { getSubscriptionPlan } from "@/lib/subscriptionPlans";
import { getSubscriptionsTestingNotice } from "@/lib/subscriptionTesting";
import type { EmployeeAiTierId } from "@/lib/employeeAi/types";
import { employeeDisplayName, listEmployees } from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";

export default function EmployeeAiSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { activeTier } = useSubscription();
  const { access, loading, refresh } = useAiAccess();
  const testingNotice = getSubscriptionsTestingNotice();
  const companyPlan = getSubscriptionPlan(activeTier);
  const crewIncluded = ownerSubscriptionIncludesCrewAi(activeTier);

  const [session, setSession] = useState<EmployeeSession>({ active: false });
  const [policyMode, setPolicyMode] = useState<CompanyAiPolicyMode>("company_sponsored");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [crew, setCrew] = useState<Employee[]>([]);
  const [aiAssistantToolsEnabled, setAiAssistantToolsEnabled] = useState(true);

  const loadLocal = useCallback(async () => {
    const [sess, policy, emps, aiToolsEnabled] = await Promise.all([
      loadEmployeeSession(),
      loadCompanyAiPolicy(),
      listEmployees("current"),
      loadAiAssistantToolsEnabled(),
    ]);
    setSession(sess);
    setPolicyMode(policy.mode);
    setCrew(emps);
    setAiAssistantToolsEnabled(aiToolsEnabled);
  }, []);

  useEffect(() => {
    void loadLocal();
  }, [loadLocal]);

  const isEmployee = access?.isEmployee ?? session.active;
  const effectivePlan = access
    ? getEmployeeAiPlan(access.check.effectiveTier)
    : getEmployeeAiPlan("free");

  const onToggleEmployeeSession = async (active: boolean) => {
    if (!active) {
      await clearEmployeeSession();
      setSession({ active: false });
      await refresh();
      return;
    }
    const emps = crew.length ? crew : await listEmployees("current");
    setCrew(emps);
    const pick = session.employeeId ? emps.find((e) => e.id === session.employeeId) : emps[0];
    const next: EmployeeSession = pick
      ? { active: true, employeeId: pick.id, displayName: employeeDisplayName(pick) }
      : { active: true, displayName: "Employee" };
    await saveEmployeeSession(next);
    setSession(next);
    await refresh();
  };

  const onPickCrewMember = async (emp: Employee) => {
    const next: EmployeeSession = {
      active: true,
      employeeId: emp.id,
      displayName: employeeDisplayName(emp),
    };
    await saveEmployeeSession(next);
    setSession(next);
    await refresh();
  };

  const onSavePolicy = async (mode: CompanyAiPolicyMode) => {
    setSavingPolicy(true);
    setPolicyMode(mode);
    await saveCompanyAiPolicy({
      mode,
      sponsoredTier: "pro_employee",
    });
    setSavingPolicy(false);
    await refresh();
  };

  const usageLine = access
    ? access.check.dailyLimit === null
      ? `${access.check.dailyUsed} questions today (fair use)`
      : `${access.check.dailyUsed} / ${access.check.dailyLimit} questions today`
    : "—";

  return (
    <StickyScrollScreen title="Crew AI" contentContainerStyle={styles.content}>
      {testingNotice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{testingNotice}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <>
          <Text style={styles.sectionLabel}>AI Assistant Tools (employee)</Text>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Enable AI Assistant Tools</Text>
              <Switch
                value={aiAssistantToolsEnabled}
                onValueChange={(v) => {
                  setAiAssistantToolsEnabled(v);
                  void saveAiAssistantToolsEnabled(v);
                }}
                accessibilityLabel="Enable AI Assistant Tools in employee menu"
              />
            </View>
            <Text style={styles.hint}>
              Self-serve prompt builders that copy to clipboard and open ChatGPT. No Ideal Solutions AI billing — crew
              uses personal ChatGPT accounts. Separate from Crew AI subscription features.
            </Text>
            <Link href={"/employee/ai-assistant" as Href} asChild>
              <Pressable style={styles.linkBtn}>
                <Text style={styles.linkText}>Open AI Assistant Tools →</Text>
              </Pressable>
            </Link>
          </View>

          <Text style={styles.sectionLabel}>Session (testing)</Text>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Simulate employee login</Text>
              <Switch
                value={session.active}
                onValueChange={(v) => void onToggleEmployeeSession(v)}
                accessibilityLabel="Toggle employee session for testing"
              />
            </View>
            <Text style={styles.hint}>
              When on, AI usage counts against crew fair-use limits included with your company app
              plan.
            </Text>
            {session.active && crew.length > 0 ? (
              <>
                <Text style={[styles.hint, { marginTop: 8 }]}>Linked crew member</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {crew.map((emp) => (
                    <Pressable
                      key={emp.id}
                      style={[
                        styles.policyOption,
                        session.employeeId === emp.id && styles.policySelected,
                        { paddingVertical: 8, paddingHorizontal: 12 },
                      ]}
                      onPress={() => void onPickCrewMember(emp)}
                    >
                      <Text style={styles.policyTitle}>{employeeDisplayName(emp)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <Link href={"/employee/clock" as Href} asChild>
              <Pressable style={styles.linkBtn}>
                <Text style={styles.linkText}>Open my time clock →</Text>
              </Pressable>
            </Link>
          </View>

          {!isEmployee ? (
            <>
              <Text style={styles.sectionLabel}>Company subscription</Text>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{companyPlan.name}</Text>
                <Text style={styles.planPrice}>{companyPlan.priceLabel}</Text>
                {crewIncluded ? (
                  <Text style={styles.sponsored}>
                    Crew AI is included with your {companyPlan.name} subscription (fair-use limits
                    apply).
                  </Text>
                ) : (
                  <Text style={styles.hint}>
                    Upgrade to Pro Contractor or Boss Man to include crew AI for your team — no
                    separate employee AI billing.
                  </Text>
                )}
                <Link href={"/settings/subscribe" as Href} asChild>
                  <Pressable style={styles.linkBtn}>
                    <Text style={styles.linkText}>View app subscription plans →</Text>
                  </Pressable>
                </Link>
              </View>

              <Text style={styles.sectionLabel}>Crew AI policy</Text>
              <Text style={styles.intro}>
                Crew members do not purchase AI separately. When your company is on Pro Contractor
                or higher, everyone on the crew gets fair-use AI included with the app subscription.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.policyOption,
                  policyMode === "company_sponsored" && styles.policySelected,
                  pressed && styles.pressed,
                ]}
                onPress={() => void onSavePolicy("company_sponsored")}
                disabled={savingPolicy}
              >
                <Text style={styles.policyTitle}>Crew AI included (recommended)</Text>
                <Text style={styles.policySub}>
                  Matches Pro+ app subscription — employees see included limits, not a personal
                  upgrade path.
                </Text>
              </Pressable>
              {__DEV__ ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.policyOption,
                    policyMode === "byo" && styles.policySelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => void onSavePolicy("byo")}
                  disabled={savingPolicy}
                >
                  <Text style={styles.policyTitle}>Legacy: individual billing (dev)</Text>
                  <Text style={styles.policySub}>
                    For testing grandfathered RevenueCat employee entitlements only.
                  </Text>
                </Pressable>
              ) : null}
              <Text style={styles.hint}>Active: {companyAiPolicyLabel(policyMode)}</Text>

              <Text style={styles.sectionLabel}>Coming soon (crew)</Text>
              {["Team messaging", "Job comm & schedules", "Assigned jobs hub"].map((label) => (
                <View key={label} style={styles.stubRow}>
                  <Ionicons name="ellipse-outline" size={18} color={colors.text} style={styles.stubIcon} />
                  <Text style={styles.stubText}>{label}</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Your crew AI</Text>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{effectivePlan.name}</Text>
                <Text style={styles.planPrice}>{effectivePlan.priceLabel}</Text>
                <Text style={styles.hint}>{usageLine}</Text>
                {access?.crewAiIncluded ? (
                  <Text style={styles.sponsored}>
                    Included with your company&apos;s {companyPlan.name} subscription
                  </Text>
                ) : (
                  <Text style={styles.hint}>
                    Starter crew allowance only. Ask your company to upgrade to Pro Contractor for
                    crew AI included with the app plan.
                  </Text>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>No separate employee AI purchase</Text>
                <Text style={styles.hint}>
                  AI for crew is covered by your company&apos;s app subscription. Fair-use limits
                  still apply to keep the service reliable for everyone.
                </Text>
                {Platform.OS !== "web" && access?.crewAiIncluded ? (
                  <Text style={styles.sponsored}>You&apos;re all set — no upgrade needed.</Text>
                ) : null}
              </View>
            </>
          )}

          {__DEV__ ? (
            <>
              <Text style={styles.sectionLabel}>Developer</Text>
              <Pressable
                style={styles.linkBtn}
                onPress={() => void resetAiUsage(isEmployee ? "employee" : "owner", session.employeeId)}
              >
                <Text style={styles.linkText}>Reset AI usage counters</Text>
              </Pressable>
              {(["free", "pro_employee", "field_supervisor"] as EmployeeAiTierId[]).map((tier) => (
                <Pressable
                  key={tier}
                  style={styles.linkBtn}
                  onPress={async () => {
                    await saveDevEmployeeTier(tier);
                    await refresh();
                  }}
                >
                  <Text style={styles.linkText}>Simulate tier: {tier}</Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </>
      )}
    </StickyScrollScreen>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    content: { padding: 24, paddingTop: 8, paddingBottom: 40, gap: 12 },
    loader: { marginTop: 24 },
    sectionLabel: {
      color: colors.text,
      opacity: 0.85,
      fontSize: 16,
      fontWeight: "700",
      marginTop: 12,
    },
    intro: { fontSize: 14, lineHeight: 20, color: colors.text, opacity: 0.82 },
    card: { ...navCardStyle(colors), gap: 6 },
    cardTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    hint: { fontSize: 13, color: colors.text, opacity: 0.72, lineHeight: 18 },
    sponsored: { fontSize: 13, fontWeight: "700", color: colors.accent, marginTop: 4 },
    notice: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: hexToRgba(colors.accent, 0.15),
    },
    noticeText: { fontSize: 13, color: colors.text, opacity: 0.9 },
    policyOption: {
      ...navCardStyle(colors),
      borderWidth: 2,
      borderColor: "transparent",
    },
    policySelected: { borderColor: hexToRgba(colors.accent, 0.55) },
    policyTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
    policySub: { fontSize: 13, color: colors.text, opacity: 0.78, marginTop: 6, lineHeight: 18 },
    planPrice: { fontSize: 15, color: colors.text, opacity: 0.85 },
    linkBtn: { paddingVertical: 10 },
    linkText: { fontSize: 15, fontWeight: "700", color: colors.accent },
    stubRow: { flexDirection: "row", alignItems: "center", gap: 10, opacity: 0.55 },
    stubIcon: { opacity: 0.5 },
    stubText: { fontSize: 15, color: colors.text },
    pressed: { opacity: 0.88 },
  });
}
