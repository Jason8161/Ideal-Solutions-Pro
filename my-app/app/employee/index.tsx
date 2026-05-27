import { Link, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { isEmployeeAppVariant } from "@/lib/auth/appVariant";
import { syncEmployeeAssignments } from "@/lib/cloud/jobAssignments";
import { registerEmployeePushTokenIfPossible } from "@/lib/cloud/pushToken";
import { loadAiAssistantToolsEnabled } from "@/lib/aiAssistant";
import { EMPLOYEE_MENU_ITEMS } from "@/lib/employeeMenuItems";
import {
  clearEmployeeSession,
  loadEmployeeSession,
  type EmployeeSession,
} from "@/lib/employeeSession";
import { canAccessForRole } from "@/lib/permissions/roleAccess";
import { resolveCurrentAppRole } from "@/lib/auth/sessionRole";
import type { AppRole } from "@/lib/auth/roles";

export default function EmployeeHomeScreen() {
  const { scStyles, styles } = useBossManChrome();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [role, setRole] = useState<AppRole>("employee");
  const [loading, setLoading] = useState(true);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const employeeVariant = isEmployeeAppVariant();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sess, aiEnabled, resolvedRole] = await Promise.all([
        loadEmployeeSession(),
        loadAiAssistantToolsEnabled(),
        resolveCurrentAppRole(),
      ]);
      setSession(sess);
      setAiAssistantEnabled(aiEnabled);
      setRole(resolvedRole);
      if (sess.active && sess.cloudAuthToken) {
        await syncEmployeeAssignments();
        void registerEmployeePushTokenIfPossible();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const companyLabel = session?.companyName?.trim() || "Your company";
  const displayName = session?.displayName?.trim();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!session?.active) {
    return (
      <ScStickyScroll
        title={employeeVariant ? "Ideal Solutions Employee" : "Employee app"}
        subtitle="Join your crew with an invite from your employer."
      >
        <Link href={"/employee/join" as Href} asChild>
          <Pressable style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }]}>
            <Text style={scStyles.primaryCtaText}>Enter invite code</Text>
          </Pressable>
        </Link>
        {!employeeVariant ? (
          <Text style={[scStyles.emptyText, { marginTop: 16 }]}>
            Your employer sends a code from Job Folder → Crew → Invite or Settings → My crew. For local testing
            without cloud, use Settings → Employee AI → employee mode.
          </Text>
        ) : null}
      </ScStickyScroll>
    );
  }

  const menuItems = EMPLOYEE_MENU_ITEMS.filter((item) => {
    if (item.key === "ai" && !aiAssistantEnabled) return false;
    return canAccessForRole(item.feature, role, session.permissions);
  });

  return (
    <ScStickyScroll
      title={employeeVariant ? "Ideal Solutions Employee" : "Employee"}
      subtitle={
        displayName
          ? `${displayName} · ${companyLabel}`
          : `${companyLabel} — field tools`
      }
    >
      {menuItems.map((item) => (
        <Link key={item.key} href={item.href} asChild>
          <Pressable
            style={({ pressed }) => [
              item.primary ? scStyles.primaryCta : scStyles.menuButton,
              pressed && { opacity: 0.9 },
              { marginBottom: 12 },
            ]}
          >
            <Text style={item.primary ? scStyles.primaryCtaText : scStyles.menuButtonText}>{item.label}</Text>
            {!item.primary ? (
              <Text style={[scStyles.subtitle, { marginTop: 4 }]}>{item.hint}</Text>
            ) : null}
          </Pressable>
        </Link>
      ))}
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 20 }]}
        onPress={() => void clearEmployeeSession().then(refresh)}
      >
        <Text style={scStyles.menuButtonText}>Sign out</Text>
      </Pressable>
    </ScStickyScroll>
  );
}
