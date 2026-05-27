import { Redirect, useLocalSearchParams } from "expo-router";

import { SettingsGroupHubScreen } from "@/components/settings/SettingsGroupHubScreen";
import { getSettingsGroup, isSettingsGroupId } from "@/lib/settingsGroups";

export default function SettingsGroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  if (!groupId || !isSettingsGroupId(groupId)) {
    return <Redirect href="/settings" />;
  }

  const group = getSettingsGroup(groupId);
  if (!group) {
    return <Redirect href="/settings" />;
  }

  return <SettingsGroupHubScreen group={group} />;
}
