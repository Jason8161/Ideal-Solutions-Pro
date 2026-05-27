import { Linking, Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { employeeDisplayName } from "@/lib/employees/employeeStorage";
import {
  dispatchStatusLabel,
  roleLabel,
} from "@/lib/employees/format";
import type { Employee } from "@/lib/employees/types";
import type { CrewDispatchStatus } from "@/lib/employees/types";
import type { BossJob } from "@/lib/bossMan/types";

type Props = {
  employee: Employee;
  dispatchStatus: CrewDispatchStatus;
  currentJob?: BossJob | null;
  onPressProfile: () => void;
  onDispatch: () => void;
};

export function CrewEmployeeCard({
  employee,
  dispatchStatus,
  currentJob,
  onPressProfile,
  onDispatch,
}: Props) {
  const { scStyles, styles } = useBossManChrome();
  const name = employeeDisplayName(employee);
  const title = employee.jobTitle?.trim() || roleLabel(employee.role);
  const phone = employee.phone?.trim() || "—";
  const jobLabel = currentJob
    ? currentJob.jobName.trim() || currentJob.customerName.trim() || "Assigned job"
    : "No active job";

  const onCall = () => {
    const digits = (employee.phone ?? "").replace(/[^\d+]/g, "");
    if (digits) void Linking.openURL(`tel:${digits}`);
  };

  const onMessage = () => {
    const digits = (employee.phone ?? "").replace(/[^\d+]/g, "");
    if (!digits) return;
    void Linking.openURL(`sms:${digits}`);
  };

  return (
    <View style={[styles.navRow, { gap: 8 }]}>
      <Pressable onPress={onPressProfile} accessibilityRole="button">
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
              {employee.firstName.charAt(0)}
              {employee.lastName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[scStyles.menuButtonText, { fontWeight: "800" }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={scStyles.subtitle} numberOfLines={1}>
              {title} · {phone}
            </Text>
            <Text style={scStyles.subtitle} numberOfLines={1}>
              {jobLabel}
            </Text>
          </View>
          <View style={[styles.badge, dispatchStatus === "emergency" && styles.badgeAccent]}>
            <Text style={[scStyles.subtitle, { fontWeight: "700", fontSize: 11 }]}>
              {dispatchStatusLabel(dispatchStatus)}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable style={styles.actionBtn} onPress={onDispatch}>
          <Text style={scStyles.menuButtonText}>Dispatch</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onCall}>
          <Text style={scStyles.menuButtonText}>Call</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onMessage}>
          <Text style={scStyles.menuButtonText}>Message</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onPressProfile}>
          <Text style={scStyles.menuButtonText}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}
