import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { accentPanelStyle, getAccentTints } from "@/components/themed/screenChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  formatAiProjectWhen,
  projectPreviewText,
  type AiAssistanceProject,
} from "@/lib/aiAssistanceProjectsStorage";

type Props = {
  visible: boolean;
  projects: AiAssistanceProject[];
  activeProjectId: string | null;
  onClose: () => void;
  onSelect: (projectId: string) => void;
  onNewProject: () => void;
  onRename: (projectId: string, title: string) => void;
  onDelete: (projectId: string) => void;
};

export function AiProjectHistoryModal({
  visible,
  projects,
  activeProjectId,
  onClose,
  onSelect,
  onNewProject,
  onRename,
  onDelete,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const startRename = (project: AiAssistanceProject) => {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        "Rename conversation",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (value) => {
              const title = value?.trim() ?? "";
              if (title) onRename(project.id, title);
            },
          },
        ],
        "plain-text",
        project.title,
      );
      return;
    }
    setRenameId(project.id);
    setRenameDraft(project.title);
  };

  const confirmRename = () => {
    if (!renameId) return;
    const title = renameDraft.trim();
    if (title) onRename(renameId, title);
    setRenameId(null);
    setRenameDraft("");
  };

  const confirmDelete = (project: AiAssistanceProject) => {
    Alert.alert("Delete conversation?", `"${project.title}" will be removed from history.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(project.id) },
    ]);
  };

  const onProjectPress = (project: AiAssistanceProject) => {
    onSelect(project.id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>Saved conversations</Text>
          <Text style={styles.sheetHint}>
            Each project keeps its own chat history on this device. Open one to continue, or start a new conversation.
          </Text>

          <TouchableOpacity style={styles.newBtn} onPress={onNewProject} activeOpacity={0.85}>
            <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.text} />
            <Text style={styles.newBtnText}>New conversation</Text>
          </TouchableOpacity>

          {renameId ? (
            <View style={styles.renameRow}>
              <VoiceTextInput
                style={styles.renameInput}
                value={renameDraft}
                onChangeText={setRenameDraft}
                placeholder="Conversation name"
                placeholderTextColor={hexToRgba(colors.text, 0.45)}
                autoFocus
                maxLength={80}
              />
              <Pressable style={styles.renameSave} onPress={confirmRename}>
                <Text style={styles.renameSaveText}>Save</Text>
              </Pressable>
              <Pressable
                style={styles.renameCancel}
                onPress={() => {
                  setRenameId(null);
                  setRenameDraft("");
                }}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {projects.length === 0 ? (
              <Text style={styles.empty}>No saved conversations yet. Ask a question to start your first project.</Text>
            ) : (
              projects.map((project) => {
                const active = project.id === activeProjectId;
                return (
                  <Pressable
                    key={project.id}
                    style={({ pressed }) => [
                      styles.row,
                      active && styles.rowActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onProjectPress(project)}
                    onLongPress={() =>
                      Alert.alert(project.title, undefined, [
                        { text: "Rename", onPress: () => startRename(project) },
                        { text: "Delete", style: "destructive", onPress: () => confirmDelete(project) },
                        { text: "Cancel", style: "cancel" },
                      ])
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${project.title}`}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {project.title}
                      </Text>
                      <Text style={styles.rowPreview} numberOfLines={2}>
                        {projectPreviewText(project)}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {formatAiProjectWhen(project.updatedAt)}
                        {project.messages.length > 0
                          ? ` · ${project.messages.length} message${project.messages.length === 1 ? "" : "s"}`
                          : ""}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = accentPanelStyle(colors, tints);

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
      alignItems: "center",
    },
    sheet: {
      width: "100%",
      maxWidth: 560,
      maxHeight: "82%",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: hexToRgba(colors.background, 0.98),
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 24,
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.2),
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    sheetHint: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
    },
    newBtn: {
      ...panel,
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    newBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    renameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
    },
    renameInput: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.25),
      backgroundColor: hexToRgba(colors.accent, 0.12),
      color: colors.text,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    renameSave: {
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    renameSaveText: {
      color: colors.accent,
      fontWeight: "800",
      fontSize: 14,
    },
    renameCancel: {
      paddingHorizontal: 6,
      paddingVertical: 8,
    },
    renameCancelText: {
      color: tints.mutedText,
      fontWeight: "700",
      fontSize: 14,
    },
    scroll: {
      marginTop: 12,
      maxHeight: 420,
    },
    empty: {
      color: tints.mutedText,
      fontSize: 14,
      lineHeight: 20,
      paddingVertical: 16,
      textAlign: "center",
    },
    row: {
      ...panel,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    rowActive: {
      backgroundColor: tints.accentTintActive,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    rowPreview: {
      fontSize: 13,
      lineHeight: 18,
      color: tints.mutedText,
    },
    rowMeta: {
      fontSize: 12,
      color: tints.mutedText,
      opacity: 0.9,
    },
    closeBtn: {
      marginTop: 8,
      paddingVertical: 14,
      alignItems: "center",
    },
    closeBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      opacity: 0.85,
    },
    pressed: { opacity: 0.88 },
  });
}
