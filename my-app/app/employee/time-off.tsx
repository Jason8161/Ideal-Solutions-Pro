import { Alert, Pressable, Text } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";

export default function EmployeeTimeOffScreen() {
  const { scStyles, styles } = useBossManChrome();

  const requestTimeOff = () => {
    Alert.alert(
      "Request time off",
      "Your request will be sent to your employer for approval.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit request", onPress: () => Alert.alert("Submitted", "Time-off request recorded.") },
      ],
    );
  };

  const requestVacation = () => {
    Alert.alert(
      "Request vacation",
      "Your vacation request will be sent to your employer for approval.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit request", onPress: () => Alert.alert("Submitted", "Vacation request recorded.") },
      ],
    );
  };

  return (
    <ScStickyScroll
      backHref="/employee/clock"
      title="Time off"
      subtitle="Request PTO or vacation and view approval status from your employer."
    >
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={requestTimeOff}
      >
        <Text style={scStyles.menuButtonText}>Request Time Off</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
        onPress={requestVacation}
      >
        <Text style={scStyles.menuButtonText}>Request Vacation</Text>
      </Pressable>
      <Text style={scStyles.emptyText}>
        Approval status and balance sync will appear here once your employer enables payroll integration.
      </Text>
    </ScStickyScroll>
  );
}
