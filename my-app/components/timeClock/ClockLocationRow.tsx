import { Pressable, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { formatClockLocationLine } from "@/lib/bossMan/clockLocationDisplay";
import { openClockLocationInMaps } from "@/lib/bossMan/clockLocationDisplay";
import type { ClockLocation } from "@/lib/bossMan/timeTrackingTypes";

type Props = {
  label: string;
  location?: ClockLocation;
};

export function ClockLocationRow({ label, location }: Props) {
  const { scStyles, styles } = useBossManChrome();

  if (!location) return null;

  const line = formatClockLocationLine(location);

  return (
    <View style={{ marginTop: 6, gap: 4 }}>
      <Text style={scStyles.cardMeta}>
        {label}: {line ?? "Coordinates recorded"}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginTop: 0 }]}
        onPress={() => void openClockLocationInMaps(location)}
        accessibilityRole="button"
        accessibilityLabel={`View ${label} on map`}
      >
        <Text style={scStyles.menuButtonText}>View on map</Text>
      </Pressable>
    </View>
  );
}
