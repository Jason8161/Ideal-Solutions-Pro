import { Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ClockLocationRow } from "@/components/timeClock/ClockLocationRow";
import { formatClockEventTime } from "@/lib/bossMan/clockLocationDisplay";
import { formatDurationShort } from "@/lib/bossMan/timeTrackingUtils";
import type { ClockLocation } from "@/lib/bossMan/timeTrackingTypes";
import type { JobsiteVerification } from "@/lib/clockVerification/types";

type Props = {
  title: string;
  timestamp: string;
  jobsiteName?: string;
  verification?: JobsiteVerification;
  location?: ClockLocation;
  shiftDurationMs?: number;
  notes?: string;
};

function verificationLabel(v?: JobsiteVerification): string {
  if (!v) return "Not checked";
  switch (v.status) {
    case "verified":
      return "Verified at jobsite";
    case "nearby":
      return v.distanceFeet != null ? `Nearby (${v.distanceFeet} ft)` : "Nearby jobsite";
    case "too_far":
      return v.distanceFeet != null ? `Far from jobsite (${v.distanceFeet} ft)` : "Far from jobsite";
    case "geofence_blocked":
      return "Outside geo-fence";
    case "no_gps":
      return "GPS not recorded";
    case "no_jobsite":
      return "No jobsite selected";
    case "supervisor_override":
      return "Supervisor override";
    default:
      return v.status;
  }
}

export function ClockConfirmationCard({
  title,
  timestamp,
  jobsiteName,
  verification,
  location,
  shiftDurationMs,
  notes,
}: Props) {
  const { scStyles } = useBossManChrome();

  return (
    <View style={[scStyles.card, { gap: 6 }]}>
      <Text style={scStyles.cardTitle}>{title}</Text>
      <Text style={scStyles.cardMeta}>{formatClockEventTime(timestamp)}</Text>
      {jobsiteName ? <Text style={scStyles.cardMeta}>Jobsite: {jobsiteName}</Text> : null}
      {verification ? (
        <Text style={scStyles.cardMeta}>Verification: {verificationLabel(verification)}</Text>
      ) : null}
      {shiftDurationMs != null ? (
        <Text style={scStyles.cardMeta}>Shift: {formatDurationShort(shiftDurationMs)}</Text>
      ) : null}
      <ClockLocationRow label="Location" location={location} />
      {notes?.trim() ? <Text style={scStyles.cardMeta}>Notes: {notes.trim()}</Text> : null}
    </View>
  );
}
