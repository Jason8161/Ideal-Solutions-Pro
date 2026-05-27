import { Pressable, Text, View } from "react-native";

import { useScStyles } from "@/components/serviceCalls/screenChrome";
import { workflowStatusLabel } from "@/lib/serviceRequestSync";
import {
  updateServiceCallWorkflowStatus,
  type ServiceCallRecord,
  type ServiceCallWorkflowStatus,
} from "@/lib/serviceCallStorage";
import { patchRemoteServiceRequestStatus } from "@/lib/serviceRequestApi";
import { getOrCreateContractorRequestToken } from "@/lib/contractorRequestToken";

const STATUSES: ServiceCallWorkflowStatus[] = [
  "new",
  "scheduled",
  "in_progress",
  "completed",
  "canceled",
];

type Props = {
  record: ServiceCallRecord;
  onUpdated: (record: ServiceCallRecord) => void;
};

export function ServiceCallWorkflowPicker({ record, onUpdated }: Props) {
  const scStyles = useScStyles();
  const current = record.workflowStatus ?? "new";

  const setStatus = async (next: ServiceCallWorkflowStatus) => {
    const updated = await updateServiceCallWorkflowStatus(record.id, next);
    if (updated) {
      onUpdated(updated);
      if (record.remoteRequestId) {
        const token = await getOrCreateContractorRequestToken();
        void patchRemoteServiceRequestStatus(token, record.remoteRequestId, next);
      }
    }
  };

  return (
    <View style={scStyles.card}>
      <Text style={scStyles.cardTitle}>Status</Text>
      <Text style={[scStyles.cardMeta, { marginBottom: 10 }]}>
        New requests from customer links start as New. Update as you schedule and complete work.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => void setStatus(s)}
            style={({ pressed }) => [
              scStyles.menuButton,
              scStyles.menuButtonSecondary,
              { paddingVertical: 10, paddingHorizontal: 12, minWidth: 0 },
              current === s && { borderWidth: 2, borderColor: "#ff8c00" },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={scStyles.menuButtonSecondaryText}>{workflowStatusLabel(s)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
