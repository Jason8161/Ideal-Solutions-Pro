import { useCallback, useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { isEmployeeSessionActive } from "@/lib/employeeSession";
import { getServiceRequestApiBaseUrl } from "@/lib/serviceRequestApi";
import { syncRemoteServiceRequests } from "@/lib/serviceRequestSync";

/**
 * Polls the service-request inbox when the app opens or returns to foreground.
 * Notifications fire inside sync when new rows are imported.
 */
export function ServiceRequestSyncWatcher() {
  const sync = useCallback(async () => {
    if (!getServiceRequestApiBaseUrl()) return;
    if (await isEmployeeSessionActive()) return;
    await syncRemoteServiceRequests();
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void sync();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [sync]);

  return null;
}
