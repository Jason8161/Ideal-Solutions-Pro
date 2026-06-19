import { Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";

export default function CheckGuyDashboardScreen() {
  const { scStyles } = useBossManChrome();

  return (
    <ScStickyScroll title="Check Guy" subtitle="Draw releases & approval history">
      <Text style={[scStyles.subtitle, { marginBottom: 16 }]}>
        Get notified when phases complete, review superintendent approvals, and approve or deny draw
        releases.
      </Text>
      <View style={scStyles.card}>
        <Text style={scStyles.cardTitle}>Coming soon</Text>
        <Text style={scStyles.cardMeta}>• Phase-complete notifications</Text>
        <Text style={scStyles.cardMeta}>• Superintendent approval review</Text>
        <Text style={scStyles.cardMeta}>• Draw approve / deny workflow</Text>
        <Text style={scStyles.cardMeta}>• Approval history</Text>
      </View>
    </ScStickyScroll>
  );
}
