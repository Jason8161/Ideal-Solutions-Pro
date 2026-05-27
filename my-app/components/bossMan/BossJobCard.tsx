import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { getAccentTints } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { formatBossMoney } from "@/lib/bossMan/money";
import type { BossJob } from "@/lib/bossMan/types";

type BossJobCardProps = {
  job: BossJob;
  onPress?: () => void;
  showCompletionDate?: boolean;
  children?: React.ReactNode;
};

export function BossJobCard({ job, onPress, showCompletionDate, children }: BossJobCardProps) {
  const { colors } = useAppTheme();
  const { scStyles, styles: chromeStyles } = useBossManChrome();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const body = (
    <View style={scStyles.card}>
      <View style={styles.titleRow}>
        <Text style={scStyles.cardTitle}>{job.customerName.trim() || "Customer"}</Text>
        <View style={[styles.badge, statusBadgeStyle(job.status, colors, chromeStyles)]}>
          <Text style={styles.badgeText}>{job.status}</Text>
        </View>
      </View>
      <Text style={scStyles.cardMeta}>
        {[job.jobName, job.address].filter((s) => s.trim()).join(" · ") || "No job name or address"}
      </Text>
      {job.jobPhase ? (
        <Text style={[scStyles.cardMeta, { marginTop: 4 }]}>Phase: {job.jobPhase}</Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.metaChip}>Est. {formatBossMoney(job.estimateTotal)}</Text>
        <Text style={styles.metaChip}>{job.paid ? "Paid" : "Unpaid"}</Text>
        <Text style={styles.metaChip}>{job.notes.length} notes</Text>
        <Text style={styles.metaChip}>{job.photoUris.length} photos</Text>
        {job.materialListId ? <Text style={styles.metaChip}>Materials linked</Text> : null}
        <Text style={styles.metaChip}>{job.serviceCallIds.length} service calls</Text>
      </View>
      {showCompletionDate && job.completedAt ? (
        <Text style={[scStyles.cardMeta, { marginTop: 8 }]}>
          Completed {new Date(job.completedAt).toLocaleDateString()}
          {job.finalInvoiceStub != null ? ` · Invoice ${formatBossMoney(job.finalInvoiceStub)}` : ""}
        </Text>
      ) : null}
      {children}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.9 }} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

function statusBadgeStyle(
  status: BossJob["status"],
  colors: ColorScheme,
  chromeStyles: ReturnType<typeof useBossManChrome>["styles"],
) {
  if (status === "Completed" || status === "Ready to Bill") {
    return chromeStyles.badgeAccent;
  }
  if (status === "Waiting on Material") {
    const { accentTintLight } = getAccentTints(colors);
    return { backgroundColor: accentTintLight };
  }
  return chromeStyles.badge;
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 4,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      maxWidth: "48%",
    },
    badgeText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "right",
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    metaChip: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
      opacity: 0.8,
    },
  });
}
