import { Redirect, useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { employeeDisplayName, listEmployees, searchEmployees } from "@/lib/employees/employeeStorage";
import { filterEmployeesForViewer } from "@/lib/employees/permissions";
import { roleLabel } from "@/lib/employees/format";
import type { Employee } from "@/lib/employees/types";
import { canAccessCrewTools } from "@/lib/subscriptionGating";

export default function MyCrewScreen() {
  const { activeTier } = useSubscription();
  const { colors } = useAppTheme();
  const { scStyles, styles } = useBossManChrome();
  const router = useRouter();
  const fieldStyle = useMemo(() => inputStyle(colors), [colors]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");

  const refresh = useCallback(() => {
    void listEmployees("current").then((rows) => {
      setEmployees(filterEmployeesForViewer(rows, { isBoss: true }));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const rows = useMemo(() => searchEmployees(employees, search), [employees, search]);

  if (!canAccessCrewTools(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  return (
    <ScStickyScroll
      backHref="/job-folder/hub/employees"
      title="My Crew"
      subtitle="Current employees on your crew."
    >
      <VoiceTextInput
        style={[fieldStyle, { marginBottom: 12 }]}
        value={search}
        onChangeText={setSearch}
        placeholder="Search name or title"
        placeholderTextColor={placeholderTextColor(colors)}
      />

      {rows.length === 0 ? (
        <Text style={scStyles.subtitle}>
          {employees.length === 0
            ? "No current employees yet. Add crew in Settings → Employees."
            : "No employees match your search."}
        </Text>
      ) : (
        rows.map((emp) => {
          const name = employeeDisplayName(emp);
          const title = emp.jobTitle?.trim() || roleLabel(emp.role);
          const phone = emp.phone?.trim() || "—";

          return (
            <Pressable
              key={emp.id}
              style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.9 }]}
              onPress={() => router.push(`/job-folder/crew/employees/${emp.id}` as Href)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${name}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={[scStyles.menuButtonText, { fontSize: 18 }]}>
                    {emp.firstName.charAt(0)}
                    {emp.lastName.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[scStyles.menuButtonText, { fontWeight: "800" }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={scStyles.subtitle} numberOfLines={1}>
                    {title} · {phone}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </ScStickyScroll>
  );
}
