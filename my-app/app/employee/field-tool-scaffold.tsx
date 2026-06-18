import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";

export default function FieldToolScaffoldScreen() {
  const { scStyles } = useBossManChrome();
  const { title } = useLocalSearchParams<{ title?: string }>();
  const screenTitle = typeof title === "string" && title.trim() ? title.trim() : "Field tool";

  return (
    <ScStickyScroll
      backHref="/employee/field-tools"
      title={screenTitle}
      subtitle="This tool is being wired up for the employee portal."
    >
      <Text style={scStyles.emptyText}>
        {screenTitle} will connect to your company workflow in a future update. Use Job Chat or Emergency
        / Need Boss Man from Field Tools if you need help right now.
      </Text>
    </ScStickyScroll>
  );
}
