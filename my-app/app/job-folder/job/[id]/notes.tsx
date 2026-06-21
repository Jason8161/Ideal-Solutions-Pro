import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScreenScrollView, StickyPageHeader, StickyScreenShell } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { addBossJobNote, getBossJobById } from "@/lib/bossMan/jobStorage";
import type { BossJob } from "@/lib/bossMan/types";

export default function BossJobNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { scStyles, styles: bossStyles } = useBossManChrome();
  const fieldStyles = useMemo(() => makeFieldStyles(colors), [colors]);
  const inputPlaceholder = useMemo(() => placeholderTextColor(colors), [colors]);

  const [job, setJob] = useState<BossJob | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadJob = useCallback(() => {
    if (!id || typeof id !== "string") return;
    void getBossJobById(id).then((row) => {
      setJob(row);
      setLoaded(true);
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [loadJob]),
  );

  const saveNote = async () => {
    if (!id || typeof id !== "string") return;
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      Alert.alert("Empty note", "Type something before saving.");
      return;
    }
    setSaving(true);
    try {
      const updated = await addBossJobNote(id, trimmed);
      if (updated) {
        setJob(updated);
        setNoteDraft("");
      }
    } finally {
      setSaving(false);
    }
  };

  const jobTitle = job?.jobName.trim() || job?.customerName.trim() || "Job";
  const backHref = id ? (`/job-folder/job/${id}` as Href) : ("/job-folder/current-jobs" as Href);

  if (!loaded) {
    return (
      <StickyScreenShell header={<StickyPageHeader title="Notes" fallbackHref="/job-folder/current-jobs" />}>
        <ScreenScrollView style={scStyles.scrollBody} contentContainerStyle={scStyles.content}>
          <Text style={scStyles.emptyText}>Loading…</Text>
        </ScreenScrollView>
      </StickyScreenShell>
    );
  }

  if (!job) {
    return (
      <StickyScreenShell header={<StickyPageHeader title="Notes" fallbackHref="/job-folder/current-jobs" />}>
        <ScreenScrollView style={scStyles.scrollBody} contentContainerStyle={scStyles.content}>
          <Text style={scStyles.emptyText}>Job not found.</Text>
          <Pressable
            style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.replace("/job-folder/current-jobs" as Href)}
          >
            <Text style={scStyles.menuButtonText}>Back to current jobs</Text>
          </Pressable>
        </ScreenScrollView>
      </StickyScreenShell>
    );
  }

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title="Job notes"
          subtitle={jobTitle}
          fallbackHref={backHref}
        />
      }
    >
      <FormScrollView
        style={scStyles.scrollBody}
        contentContainerStyle={scStyles.content}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
      >
          <Text style={scStyles.sectionLabel}>New note</Text>
          <VoiceTextInput
            value={noteDraft}
            onChangeText={setNoteDraft}
            style={[fieldStyles.input, fieldStyles.textArea]}
            placeholder="Type your note…"
            placeholderTextColor={inputPlaceholder}
            multiline
            autoFocus
          />
          <Pressable
            style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }, saving && { opacity: 0.6 }]}
            onPress={() => void saveNote()}
            disabled={saving}
          >
            <Text style={scStyles.menuButtonText}>{saving ? "Saving…" : "Save note"}</Text>
          </Pressable>

          <Text style={[scStyles.sectionLabel, { marginTop: 20 }]}>Stored notes</Text>
          {job.notes.length === 0 ? (
            <Text style={scStyles.emptyText}>No notes yet. Save your first note above.</Text>
          ) : (
            [...job.notes]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((note) => (
                <View key={note.id} style={scStyles.card}>
                  <Text style={scStyles.cardMeta}>{formatNoteTimestamp(note.createdAt)}</Text>
                  <Text style={[scStyles.cardTitle, { marginTop: 4, fontWeight: "600" }]}>{note.text}</Text>
                </View>
              ))
          )}

          <Pressable
            style={({ pressed }) => [bossStyles.actionBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push(backHref)}
          >
            <Text style={scStyles.menuButtonText}>Back to job</Text>
          </Pressable>
      </FormScrollView>
    </StickyScreenShell>
  );
}

function formatNoteTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function makeFieldStyles(colors: import("@/lib/colorSchemeStorage").ColorScheme) {
  return StyleSheet.create({
    input: {
      ...inputStyle(colors),
    },
    textArea: { minHeight: 120, textAlignVertical: "top" },
  });
}
