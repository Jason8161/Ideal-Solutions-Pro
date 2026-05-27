import { Pressable, StyleSheet, Text, View } from "react-native";

import { EMPLOYEE_TEXT, useEmployeeChrome } from "@/components/employees/employeeTheme";
import { employeeDisplayName, formatPayRate, statusLabel } from "@/lib/employees/format";
import type { Employee } from "@/lib/employees/types";

type Props = {
  employee: Employee;
  onPress: () => void;
};

export function EmployeeCard({ employee, onPress }: Props) {
  const { styles } = useEmployeeChrome();
  const name = employeeDisplayName(employee);
  const pay = formatPayRate(employee.payRate, employee.payType);
  const job = employee.jobTitle?.trim() || "No job title";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, local.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${name}`}
    >
      <View style={local.header}>
        <Text style={local.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={[styles.badge, employee.status === "previous" && styles.badgePrevious]}>
          <Text style={styles.badgeText}>{statusLabel(employee.status)}</Text>
        </View>
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {job}
      </Text>
      <Text style={local.pay} numberOfLines={1}>
        {pay}
      </Text>
    </Pressable>
  );
}

const local = StyleSheet.create({
  card: {
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    flex: 1,
    color: EMPLOYEE_TEXT,
    fontSize: 17,
    fontWeight: "800",
  },
  pay: {
    color: EMPLOYEE_TEXT,
    fontSize: 15,
    fontWeight: "700",
    opacity: 0.9,
  },
});
