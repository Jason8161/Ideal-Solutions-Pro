import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { loadJobsForCurrentUser } from "@/lib/bossMan/employeeJobFilter";
import { markBossJobComplete } from "@/lib/bossMan/jobStorage";
import { isEmployeeSessionActive } from "@/lib/employeeSession";
import type { BossJob } from "@/lib/bossMan/types";

const ROW_TEXT = "#FFFFFF";

function jobRowLabel(job: BossJob): string {
  const parts = [
    job.customerName.trim() || "Customer",
    job.status,
    job.jobPhase?.trim(),
  ].filter(Boolean);
  return parts.join(" · ");
}

function openJobActions(
  job: BossJob,
  router: ReturnType<typeof useRouter>,
  onComplete: () => void,
  employeeMode: boolean,
) {
  const title = job.jobName.trim() || job.customerName.trim() || "Job";
  const jobHref = `/job-folder/job/${job.id}` as Href;
  const scheduleHref = `/job-folder/schedule?jobId=${job.id}` as Href;

  if (employeeMode) {
    Alert.alert(title, jobRowLabel(job), [
      { text: "Cancel", style: "cancel" },
      { text: "View details", onPress: () => router.push(jobHref) },
      { text: "Add photos", onPress: () => router.push(`/job-folder/job/${job.id}?focus=photos` as Href) },
      { text: "Add notes", onPress: () => router.push(`/job-folder/job/${job.id}/notes` as Href) },
      { text: "Schedule", onPress: () => router.push(scheduleHref) },
    ]);
    return;
  }

  Alert.alert(title, jobRowLabel(job), [
    { text: "Cancel", style: "cancel" },
    {
      text: "View details",
      onPress: () => router.push(jobHref),
    },
    {
      text: "Edit job",
      onPress: () => router.push(jobHref),
    },
    {
      text: "Schedule",
      onPress: () => router.push(scheduleHref),
    },
    {
      text: "Add notes",
      onPress: () => router.push(`/job-folder/job/${job.id}/notes` as Href),
    },
    {
      text: "Job report",
      onPress: () => router.push(`/job-folder/job/${job.id}/report` as Href),
    },
    {
      text: "Add photos",
      onPress: () => router.push(`/job-folder/job/${job.id}?focus=photos` as Href),
    },
    {
      text: "Create invoice",
      onPress: () =>
        router.push(`/job-folder/invoices/invoice-edit?jobId=${job.id}` as Href),
    },
    {
      text: "Mark complete",
      style: "destructive",
      onPress: () => {
        Alert.alert("Mark complete?", `Move "${job.jobName || job.customerName}" to completed jobs?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Complete",
            onPress: () => void markBossJobComplete(job.id).then(onComplete),
          },
        ]);
      },
    },
  ]);
}

export default function CurrentJobsScreen() {
  const { scStyles } = useBossManChrome();
  const rowStyles = useMemo(() => makeRowStyles(), []);
  const router = useRouter();
  const [jobs, setJobs] = useState<BossJob[]>([]);
  const [employeeMode, setEmployeeMode] = useState(false);

  const refresh = useCallback(() => {
    void Promise.all([loadJobsForCurrentUser(), isEmployeeSessionActive()]).then(([rows, emp]) => {
      setJobs(rows);
      setEmployeeMode(emp);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <ScStickyScroll
      backHref={employeeMode ? "/employee" : "/job-folder/hub/jobs-estimates"}
      title="Current jobs"
      subtitle={employeeMode ? "Assigned jobs — read only." : "Tap a job name for actions."}
    >
      {!employeeMode ? (
        <Pressable
          style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, { marginBottom: 16 }]}
          onPress={() => router.push("/job-folder/new" as Href)}
          accessibilityRole="button"
          accessibilityLabel="Add new job"
        >
          <Text style={scStyles.primaryCtaText}>+ New job</Text>
        </Pressable>
      ) : null}

      {jobs.length === 0 ? (
        <Text style={scStyles.emptyText}>
          {employeeMode
            ? "No assigned jobs yet. Your boss will assign work from the schedule."
            : "No active jobs yet. Tap + New job above or convert an estimate to a job."}
        </Text>
      ) : (
        <View style={rowStyles.list}>
          {jobs.map((job) => {
            const jobName = job.jobName.trim() || "Job";
            return (
              <Pressable
                key={job.id}
                style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.85 }]}
                onPress={() => openJobActions(job, router, refresh, employeeMode)}
                accessibilityRole="button"
                accessibilityLabel={jobName}
              >
                <Text style={rowStyles.lineText} numberOfLines={1}>
                  {jobName}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScStickyScroll>
  );
}

function makeRowStyles() {
  return StyleSheet.create({
    list: {
      gap: 2,
    },
    row: {
      backgroundColor: "transparent",
      paddingVertical: 10,
      marginBottom: 4,
    },
    lineText: {
      color: ROW_TEXT,
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 22,
    },
  });
}
