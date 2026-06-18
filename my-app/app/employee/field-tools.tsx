import { useRouter, type Href } from "expo-router";
import { Pressable, Text } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";

type FieldToolItem = {
  label: string;
  href?: Href;
  scaffoldTitle?: string;
};

const FIELD_TOOLS: FieldToolItem[] = [
  { label: "Job Photos", href: "/job-folder/job-photos" },
  { label: "Material Request", href: "/employee/ai-assistant/material-request" },
  { label: "Job Chat", href: "/employee/messages" },
  { label: "Tool Checkout", scaffoldTitle: "Tool Checkout" },
  { label: "Vehicle Inspection", scaffoldTitle: "Vehicle Inspection" },
  { label: "Safety Report", href: "/employee/ai-assistant/safety-question" },
  { label: "Need Help", scaffoldTitle: "Need Help" },
  { label: "Emergency / Need Boss Man", scaffoldTitle: "Emergency / Need Boss Man" },
  { label: "Inventory Update", scaffoldTitle: "Inventory Update" },
  { label: "Ready for Inspection", scaffoldTitle: "Ready for Inspection" },
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
          onPress={() => {
            if (item.href) {
              router.push(item.href);
              return;
            }
            router.push(
              `/employee/field-tool-scaffold?title=${encodeURIComponent(item.scaffoldTitle ?? item.label)}` as Href,
            );
          }}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <Text style={scStyles.menuButtonText}>{item.label}</Text>
        </Pressable>
      ))}
    </ScStickyScroll>
  );
}
