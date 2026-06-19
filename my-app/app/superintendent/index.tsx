import { Link, type Href } from "expo-router";
import { Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";

export default function SuperintendentDashboardScreen() {
  const { scStyles } = useBossManChrome();

  return (
    <ScStickyScroll title="Superintendent" subtitle="Phase verification & inspections">
      <Text style={[scStyles.subtitle, { marginBottom: 16 }]}>
        Review assigned projects, verify phase completion, and add inspection notes. Draw releases are
        handled by Check Guy.
      </Text>
      <View style={scStyles.card}>
        <Text style={scStyles.cardTitle}>Coming soon</Text>
        <Text style={scStyles.cardMeta}>• Assigned projects list</Text>
        <Text style={scStyles.cardMeta}>• Approve / reject phase completion</Text>
        <Text style={scStyles.cardMeta}>• Inspection photos & notes</Text>
      </View>
      <Link href={"/job-folder/current-jobs" as Href} asChild>
        <Text style={[scStyles.menuButtonText, { marginTop: 12 }]}>View assigned jobs (preview)</Text>
      </Link>
    </ScStickyScroll>
  );
}
