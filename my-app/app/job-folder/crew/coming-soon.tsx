import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { FUTURE_CREW_FEATURES } from "@/lib/crew/futureFeatures";
import { canAccessCrewTools } from "@/lib/subscriptionGating";

export default function CrewComingSoonScreen() {
  const { activeTier } = useSubscription();
  const { scStyles, styles } = useBossManChrome();
  const { feature } = useLocalSearchParams<{ feature?: string }>();

  const hit = FUTURE_CREW_FEATURES.find((f) => f.key === feature) ?? {
    key: "unknown",
    label: "Coming soon",
    subtitle: "This crew feature is on the roadmap.",
  };

  if (!canAccessCrewTools(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  return (
    <ScStickyScroll backHref="/job-folder/crew" title={hit.label} subtitle="Coming soon">
      <View style={styles.navRow}>
        <Text style={scStyles.menuButtonText}>{hit.subtitle}</Text>
      </View>
      <Text style={scStyles.subtitle}>
        Placeholder screen — wire GPS, payroll, fleet, safety, AI scheduling, and customer ETA in
        future releases without changing navigation.
      </Text>
    </ScStickyScroll>
  );
}
