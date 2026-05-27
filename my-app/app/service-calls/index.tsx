import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CustomerRequestShareButton } from "@/components/serviceCalls/CustomerRequestShareButton";
import { ServiceCallList } from "@/components/serviceCalls/ServiceCallList";
import { ScStickyScroll, useScStyles } from "@/components/serviceCalls/screenChrome";
import { CUSTOMER_REQUEST_SHARE_BUTTON_LABEL } from "@/lib/customerServiceRequest";
import { loadCurrentServiceCalls, type ServiceCallRecord } from "@/lib/serviceCallStorage";
import { syncRemoteServiceRequests } from "@/lib/serviceRequestSync";

export default function ServiceCallsHubScreen() {
  const scStyles = useScStyles();
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
      showBack={false}
      title="Service calls"
      subtitle="Tap a current call to open it, start a new one, send a Request Service link, or review completed work."
    >
      <View style={{ marginBottom: 4 }}>
        <CustomerRequestShareButton variant="primary" />
      </View>
      <Text style={[scStyles.subtitle, { marginBottom: 16, marginTop: -4 }]}>
        Tap {CUSTOMER_REQUEST_SHARE_BUTTON_LABEL} to send a unique link by text or email. Customers open Request Service
        in their browser, submit the form, and the request appears below.
      </Text>

      <Text style={[scStyles.sectionLabel, { marginBottom: 10 }]}>Current service calls</Text>
      <ServiceCallList
        records={records}
        emptyMessage="No current service calls. Tap Create new service call below or send a Request Service link."
        hrefForId={(id) => `/service-calls/${id}`}
      />

      <Link href="/service-calls/new" asChild>
        <Pressable style={({ pressed }) => [scStyles.menuButton, pressed && { opacity: 0.9 }]}>
          <Text style={scStyles.menuButtonText}>Create new service call</Text>
        </Pressable>
      </Link>

      <Link href="/service-calls/completed" asChild>
        <Pressable
          style={({ pressed }) => [scStyles.menuButton, scStyles.menuButtonSecondary, pressed && { opacity: 0.9 }]}
        >
          <Text style={scStyles.menuButtonSecondaryText}>View completed service calls</Text>
        </Pressable>
      </Link>
    </ScStickyScroll>
  );
}
