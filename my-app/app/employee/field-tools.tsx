import { useRouter, type Href } from "expo-router";
import { Pressable, Text } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";

type FieldToolItem = {
  label: string;
  href: Href;
};

/** Wired routes only — scaffold placeholders stay out of the list until implemented. */
const FIELD_TOOLS: FieldToolItem[] = [
  { label: "Job Photos", href: "/job-folder/job-photos" as Href },
  { label: "Material Request", href: "/employee/ai-assistant/material-request" as Href },
  { label: "Job Chat", href: "/employee/messages" as Href },
  { label: "Safety Report", href: "/employee/ai-assistant/safety-question" as Href },
];

export default function EmployeeFieldToolsScreen() {
  const { scStyles, styles } = useBossManChrome();
  const router = useRouter();

  return (
    <ScStickyScroll
      backHref="/employee"
      title="Field Tools"
      subtitle="Quick links for jobsite tasks — photos, materials, safety, and support."
    >
      {FIELD_TOOLS.map((item) => (
        <Pressable
          key={item.label}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push(item.href)}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <Text style={scStyles.menuButtonText}>{item.label}</Text>
        </Pressable>
      ))}
    </ScStickyScroll>
  );
}
