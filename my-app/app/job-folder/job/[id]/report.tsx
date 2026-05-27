import { useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { formatBossMoney } from "@/lib/bossMan/money";
import { getBossJobById } from "@/lib/bossMan/jobStorage";
import type { BossJob } from "@/lib/bossMan/types";

export default function BossJobReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scStyles, styles: bossStyles } = useBossManChrome();
  const [job, setJob] = useState<BossJob | null | undefined>(undefined);

  const loadJob = useCallback(() => {
    if (!id || typeof id !== "string") {
      setJob(null);
      return;
    }
    void getBossJobById(id).then(setJob);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [loadJob]),
  );

  const jobDetailHref = id && typeof id === "string" ? (`/job-folder/job/${id}` as Href) : ("/job-folder/current-jobs" as Href);

  if (job === undefined) {
    return (
      <ScStickyScroll title="Job report" subtitle="Loading…" backHref={jobDetailHref}>
        <Text style={scStyles.emptyText}>Loading job report…</Text>
      </ScStickyScroll>
    );
  }

  if (!job) {
    return (
      <ScStickyScroll title="Job report" subtitle="Job not found." backHref="/job-folder/current-jobs">
        <Text style={scStyles.emptyText}>This job could not be found.</Text>
      </ScStickyScroll>
    );
  }

  const title = job.jobName.trim() || job.customerName.trim() || "Job report";

  return (
    <ScStickyScroll
      title="Job report"
      subtitle={title}
      backHref={jobDetailHref}
    >
      <Text style={scStyles.sectionLabel}>Summary</Text>
      <Text style={scStyles.cardTitle}>{job.customerName.trim() || "Customer"}</Text>
      <Text style={scStyles.cardMeta}>
        {job.status} · Estimate {formatBossMoney(job.estimateTotal)} · {job.paid ? "Paid" : "Unpaid"}
      </Text>
      {job.address.trim() ? <Text style={[scStyles.cardMeta, { marginTop: 6 }]}>{job.address.trim()}</Text> : null}

      <Text style={[scStyles.sectionLabel, { marginTop: 20 }]}>Activity</Text>
      <Text style={scStyles.cardMeta}>
        {job.notes.length} note{job.notes.length === 1 ? "" : "s"} · {job.photoUris.length} photo
        {job.photoUris.length === 1 ? "" : "s"}
      </Text>

      <Text style={[scStyles.sectionLabel, { marginTop: 20 }]}>Coming soon</Text>
      <Text style={scStyles.emptyText}>
        Revenue, job status, and crew productivity reports for this job will live here.
      </Text>

      <Pressable
        style={({ pressed }) => [bossStyles.actionBtn, { marginTop: 16 }, pressed && { opacity: 0.9 }]}
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel="Export job report"
      >
        <Text style={scStyles.menuButtonText}>Export report (coming soon)</Text>
      </Pressable>
    </ScStickyScroll>
  );
}
