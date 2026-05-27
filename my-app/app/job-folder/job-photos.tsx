import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { ScStickyScroll, useScStyles } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { loadBossJobs, removeBossJobPhoto } from "@/lib/bossMan/jobStorage";

type PhotoRow = {
  jobId: string;
  customerName: string;
  jobName: string;
  uri: string;
};

export default function JobPhotosScreen() {
  const scStyles = useScStyles();
  const { colors } = useAppTheme();
  const removeStyles = useMemo(() => makeRemoveStyles(colors), [colors]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);

  const loadPhotos = useCallback(() => {
    void loadBossJobs().then((jobs) => {
      const rows: PhotoRow[] = [];
      for (const job of jobs) {
        for (const uri of job.photoUris) {
          rows.push({
            jobId: job.id,
            customerName: job.customerName,
            jobName: job.jobName,
            uri,
          });
        }
      }
      setPhotos(rows);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [loadPhotos]),
  );

  const removePhoto = (row: PhotoRow) => {
    const label = `${row.customerName.trim() || "Customer"} — ${row.jobName.trim() || "Job"}`;
    Alert.alert("Remove photo?", label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeBossJobPhoto(row.jobId, row.uri).then(() => loadPhotos());
        },
      },
    ]);
  };

  return (
    <ScStickyScroll
      backHref="/job-folder/hub/jobs-estimates"
      title="Job photos"
      subtitle="Photos attached to jobs. Add more from a job’s edit screen."
    >
      {photos.length === 0 ? (
        <Text style={scStyles.emptyText}>No job photos yet. Open a job and tap Add photo.</Text>
      ) : (
        photos.map((row, index) => (
          <View key={`${row.jobId}-${row.uri}-${index}`} style={[scStyles.card, { marginBottom: 12 }]}>
            <Text style={scStyles.cardTitle}>
              {row.customerName.trim() || "Customer"} — {row.jobName.trim() || "Job"}
            </Text>
            <Image
              source={{ uri: row.uri }}
              style={{ width: "100%", height: 200, borderRadius: 10, marginTop: 10 }}
              resizeMode="cover"
              accessibilityLabel="Job photo"
            />
            <Pressable
              style={({ pressed }) => [removeStyles.removeBtn, pressed && { opacity: 0.85 }]}
              onPress={() => removePhoto(row)}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Text style={removeStyles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScStickyScroll>
  );
}

function makeRemoveStyles(colors: import("@/lib/colorSchemeStorage").ColorScheme) {
  return StyleSheet.create({
    removeBtn: {
      alignSelf: "flex-end",
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "transparent",
    },
    removeText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  });
}
