import { Pressable, StyleSheet, Text, View } from "react-native";

import { EMPLOYEE_TEXT, useEmployeeChrome } from "@/components/employees/employeeTheme";
import type { EmployeeStatus } from "@/lib/employees/types";

type Props = {
  active: EmployeeStatus;
  onChange: (status: EmployeeStatus) => void;
};

export function EmployeeStatusTabs({ active, onChange }: Props) {
  const { styles } = useEmployeeChrome();

  return (
    <View style={local.row}>
      <Pressable
        onPress={() => onChange("current")}
        style={({ pressed }) => [
          styles.tab,
          active === "current" && styles.tabActive,
          pressed && local.pressed,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === "current" }}
      >
        <Text style={local.tabText}>Current Employees</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("previous")}
        style={({ pressed }) => [
          styles.tab,
          active === "previous" && styles.tabActive,
          pressed && local.pressed,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === "previous" }}
      >
        <Text style={local.tabText}>Previous Employees</Text>
      </Pressable>
    </View>
  );
}

const local = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  tabText: {
    color: EMPLOYEE_TEXT,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  pressed: { opacity: 0.88 },
});
