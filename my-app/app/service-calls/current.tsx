import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ServiceCallList } from "@/components/serviceCalls/ServiceCallList";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { loadCurrentServiceCalls, type ServiceCallRecord } from "@/lib/serviceCallStorage";
import { syncRemoteServiceRequests } from "@/lib/serviceRequestSync";

export default function CurrentServiceCallsScreen() {
  const [records, setRecords] = useState<ServiceCallRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await syncRemoteServiceRequests();
        const rows = await loadCurrentServiceCalls();
        setRecords(rows);
      })();
    }, []),
  );

  return (
    <ScStickyScroll
      backHref="/service-calls"
      title="Current service calls"
      subtitle="Active jobs you have not marked complete yet. Tap one to open it."
    >
      <ServiceCallList
        records={records}
        emptyMessage="No current service calls. Tap Create new service call from the previous screen to add one."
        hrefForId={(id) => `/service-calls/${id}`}
      />
    </ScStickyScroll>
  );
}
