import { usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, Text, View, type AppStateStatus } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { routePathKey } from "@/lib/routePath";
import { formatClockEventTime, formatClockLocationLine } from "@/lib/bossMan/clockLocationDisplay";
import { openClockLocationInMaps } from "@/lib/bossMan/clockLocationDisplay";
import {
  dismissOwnerTimeClockAlert,
  deliverPendingOwnerTimeClockAlerts,
} from "@/lib/bossMan/ownerTimeClockAlertDelivery";
import { markAllOwnerTimeClockAlertsRead } from "@/lib/bossMan/ownerTimeClockAlerts";
import type { OwnerTimeClockAlert } from "@/lib/bossMan/timeTrackingTypes";
import { isEmployeeSessionActive } from "@/lib/employeeSession";

export function OwnerTimeClockAlertsBanner() {
  const { scStyles, styles } = useBossManChrome();
  const pathname = usePathname();
  const routeKey = routePathKey(pathname);
  const [alerts, setAlerts] = useState<OwnerTimeClockAlert[]>([]);
  const [hidden, setHidden] = useState(false);

  const refresh = useCallback(async () => {
    if (await isEmployeeSessionActive()) {
      setAlerts([]);
      return;
    }
    const unread = await deliverPendingOwnerTimeClockAlerts();
    setAlerts(unread);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, routeKey]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void refresh();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [refresh]);

  if (hidden || alerts.length === 0) return null;

  const latest = alerts[0];
  const verb = latest.kind === "clock_in" ? "clocked in" : "clocked out";
  const loc = formatClockLocationLine(latest.location);

  return (
    <View style={[scStyles.card, { marginHorizontal: 20, marginBottom: 8, gap: 6 }]}>
      <Text style={scStyles.cardTitle}>Time clock</Text>
      <Text style={scStyles.cardMeta}>
        {latest.employeeName} {verb} · {formatClockEventTime(latest.at)}
        {loc ? ` · ${loc}` : ""}
      </Text>
      {alerts.length > 1 ? (
        <Text style={scStyles.cardMeta}>{alerts.length - 1} more unread alert(s)</Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {latest.location ? (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginBottom: 0 }]}
            onPress={() => void openClockLocationInMaps(latest.location!)}
          >
            <Text style={scStyles.menuButtonText}>View on map</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginBottom: 0 }]}
          onPress={() => void dismissOwnerTimeClockAlert(latest.id).then(refresh)}
        >
          <Text style={scStyles.menuButtonText}>Dismiss</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.9 }, { marginBottom: 0 }]}
          onPress={() =>
            void markAllOwnerTimeClockAlertsRead().then(() => {
              setAlerts([]);
              setHidden(true);
            })
          }
        >
          <Text style={scStyles.menuButtonText}>Clear all</Text>
        </Pressable>
      </View>
    </View>
  );
}
