import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { ClockVerificationSettings } from "@/components/clockVerification/ClockVerificationSettings";
import { settingsBackHref, settingsBackLabel } from "@/lib/settingsGroups";
import type { Href } from "expo-router";

export default function ClockVerificationSettingsScreen() {
  return (
    <ScStickyScroll
      backHref={settingsBackHref("clock-verification") as Href}
      title="Clock verification"
      subtitle={settingsBackLabel("clock-verification")}
    >
      <ClockVerificationSettings />
    </ScStickyScroll>
  );
}
