import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, View } from "react-native";

import { useScStyles } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { JobFolderCategory } from "@/lib/bossMan/jobFolderCategories";

/** Large translucent hub card for Job Folder category landing. */
export function JobFolderCategoryCard({ category }: { category: JobFolderCategory }) {
  const { colors } = useAppTheme();
  const scStyles = useScStyles();
  const rowStyles = useMemo(() => makeRowStyles(), []);

  return (
    <View style={rowStyles.row}>
      <MaterialCommunityIcons name={category.icon} size={32} color={colors.text} />
      <View style={rowStyles.textCol}>
        <Text style={[scStyles.menuButtonText, rowStyles.title]}>{category.label}</Text>
        <Text style={[scStyles.subtitle, rowStyles.subtitle]}>{category.subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={28} color={colors.text} style={rowStyles.chevron} />
    </View>
  );
}

function makeRowStyles() {
  return {
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      width: "100%" as const,
    },
    textCol: {
      flex: 1,
      gap: 6,
    },
    title: {
      fontSize: 20,
    },
    subtitle: {
      textAlign: "left" as const,
      marginTop: 0,
      fontSize: 14,
      lineHeight: 20,
    },
    chevron: {
      opacity: 0.85,
    },
  };
}
