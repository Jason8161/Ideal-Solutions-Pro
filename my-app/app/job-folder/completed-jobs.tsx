import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScStickyScroll, useScStyles } from "@/components/serviceCalls/screenChrome";
import { loadCompletedBossJobs } from "@/lib/bossMan/jobStorage";
import type { BossJob } from "@/lib/bossMan/types";

export default function CompletedJobsScreen() {
  const scStyles = useScStyles();
  const styles = useMemo(() => makeStyles(), []);
  const router = useRouter();
  const [jobs, setJobs] = useState<BossJob[]>([]);

  const refresh = useCallback(() => {
    void loadCompletedBossJobs().then(setJobs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <ScStickyScroll
      backHref="/job-folder/hub/jobs-estimates"
      title="Completed jobs"
      subtitle="Tap a job name for full details, notes, and actions."
    >
      {jobs.length === 0 ? (
        <Text style={scStyles.emptyText}>No completed jobs yet. Mark a current job complete when work is done.</Text>
      ) : (
        jobs.map((job) => (
          <View key={job.id} style={styles.card}>
            <Text style={styles.customerName}>{job.customerName.trim() || "Customer"}</Text>
            <Pressable
              style={({ pressed }) => [styles.jobNameBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/job-folder/job/${job.id}` as Href)}
              accessibilityRole="button"
              accessibilityLabel={`Open job ${job.jobName.trim() || "Job"}`}
            >
              <Text style={styles.jobNameText}>{job.jobName.trim() || "Job"}</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScStickyScroll>
  );
}

function makeStyles() {
  return StyleSheet.create({
    card: {
      backgroundColor: "transparent",
      paddingVertical: 10,
      marginBottom: 6,
    },
    customerName: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
    },
    jobNameBtn: {
      alignSelf: "flex-start",
      marginTop: 4,
    },
    jobNameText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
  });
}
