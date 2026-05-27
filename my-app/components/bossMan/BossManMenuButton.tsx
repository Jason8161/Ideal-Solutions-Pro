import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, View } from "react-native";

import { useScStyles } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { BossManMenuItem } from "@/lib/bossMan/bossManMenuItems";

export function BossManMenuButton({ item }: { item: BossManMenuItem }) {
  const { colors } = useAppTheme();
  const scStyles = useScStyles();
  const rowStyles = useMemo(() => makeRowStyles(), []);

  return (
    <View style={rowStyles.row}>
      <MaterialCommunityIcons name={item.icon} size={24} color={colors.text} />
      <View style={rowStyles.textCol}>
        <Text style={scStyles.menuButtonText}>{item.label}</Text>
        {item.subtitle ? <Text style={[scStyles.subtitle, rowStyles.subtitle]}>{item.subtitle}</Text> : null}
      </View>
    </View>
  );
}

function makeRowStyles() {
  return {
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      width: "100%" as const,
    },
    textCol: {
      flex: 1,
      gap: 4,
    },
    subtitle: {
      textAlign: "left" as const,
      marginTop: 0,
    },
  };
}
