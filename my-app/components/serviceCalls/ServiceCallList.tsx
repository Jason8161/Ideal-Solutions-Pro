import { Link } from "expo-router";
import { Pressable, Text } from "react-native";

import { useScStyles } from "@/components/serviceCalls/screenChrome";
import { priorityLabel } from "@/lib/customerServiceRequest";
import { workflowStatusLabel } from "@/lib/serviceRequestSync";
import {
  formatServiceCallDate,
  serviceCallSubtitle,
  serviceCallTitle,
  type ServiceCallRecord,
} from "@/lib/serviceCallStorage";

const URGENT_TEXT_COLOR = "#ef4444";

function isUrgentCurrentCall(record: ServiceCallRecord): boolean {
  return (
    record.status === "current" &&
    (record.priority === "urgent" || record.priority === "emergency")
  );
}

export function ServiceCallList({
  records,
  emptyMessage,
  hrefForId,
}: {
  records: ServiceCallRecord[];
  emptyMessage: string;
  hrefForId: (id: string) => `/service-calls/${string}` | `/service-calls/complete/${string}`;
}) {
  const scStyles = useScStyles();
  if (records.length === 0) {
    return <Text style={scStyles.emptyText}>{emptyMessage}</Text>;
  }

  return (
    <>
      {records.map((record) => {
        const urgentText = isUrgentCurrentCall(record) ? { color: URGENT_TEXT_COLOR } : undefined;

        return (
          <Link key={record.id} href={hrefForId(record.id)} asChild>
            <Pressable style={({ pressed }) => [scStyles.card, pressed && { opacity: 0.9 }]}>
              <Text style={[scStyles.cardTitle, urgentText]}>{serviceCallTitle(record)}</Text>
              <Text style={[scStyles.cardMeta, urgentText]}>
                {workflowStatusLabel(record.workflowStatus ?? "new")}
                {record.priority && record.priority !== "normal"
                  ? ` · ${priorityLabel(record.priority)}`
                  : ""}
                {" · "}
                {record.customerSubmittedAt
                  ? formatServiceCallDate(record.customerSubmittedAt)
                  : formatServiceCallDate(record.createdAt)}
                {record.status === "completed" && record.completion?.completedAt
                  ? ` · Done ${formatServiceCallDate(record.completion.completedAt)}`
                  : ""}
              </Text>
              <Text style={[scStyles.cardMeta, { marginTop: 6 }, urgentText]}>
                {serviceCallSubtitle(record)}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </>
  );
}
