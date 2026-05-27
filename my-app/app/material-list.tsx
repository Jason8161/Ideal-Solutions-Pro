import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { VoiceTextInput } from "@/components/VoiceTextInput";

import { HOME_FALLBACK_HREF, ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import {
  alertComingSoon,
  MATERIAL_LIST_SCREEN_DISABLED,
} from "@/lib/homeNavigation";
import {
  getAccentTints,
  inputStyle,
  navCardStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import {
  offerMaterialListImport,
  parseMaterialListFromClipboard,
  parseMaterialListFromFile,
} from "@/lib/importMaterialListFromNotes";
import { composeMaterialListEmail } from "@/lib/materialListEmail";
import {
  loadMaterialLines,
  newMaterialLineId,
  type MaterialLine,
  saveMaterialLines,
} from "@/lib/materialListStorage";
// TODO: Re-enable "Price materials" when pricing backend (catalog search) is ready — see priceMaterialListBatch.
import {
  defaultSavedMaterialListName,
  deleteSavedMaterialList,
  formatSavedMaterialListDate,
  loadSavedMaterialLists,
  materialLinesFromSnapshot,
  renameSavedMaterialList,
  saveMaterialListSnapshot,
  type SavedMaterialList,
} from "@/lib/savedMaterialListsStorage";

type NameModalMode = { kind: "save" } | { kind: "rename"; id: string };

type EmailModalMode = { kind: "current" } | { kind: "saved"; record: SavedMaterialList };

export default function MaterialListScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inputPlaceholder = useMemo(() => placeholderTextColor(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();

  const [lines, setLines] = useState<MaterialLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedLists, setSavedLists] = useState<SavedMaterialList[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [nameModal, setNameModal] = useState<NameModalMode | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [emailModal, setEmailModal] = useState<EmailModalMode | null>(null);
  const [emailJobRefDraft, setEmailJobRefDraft] = useState("");

  const refreshSavedLists = useCallback(() => {
    void loadSavedMaterialLists().then((rows) => {
      setSavedLists(rows);
      setSavedLoaded(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadMaterialLines().then((rows) => {
      if (!cancelled) {
        setLines(rows);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSavedLists();
    }, [refreshSavedLists]),
  );

  useEffect(() => {
    if (params.focus !== "save" || !loaded) return;
    const id = setTimeout(() => {
      if (lines.length > 0) {
        setNameDraft(defaultSavedMaterialListName());
        setNameModal({ kind: "save" });
      } else {
        Alert.alert(
          "Nothing to save yet",
          "Add lines to your material list on this screen, then tap Save list.",
        );
      }
      void router.setParams({ focus: undefined });
    }, 0);
    return () => clearTimeout(id);
  }, [params.focus, loaded, lines.length, router]);

  const persist = useCallback(async (next: MaterialLine[]) => {
    setLines(next);
    await saveMaterialLines(next);
  }, []);

  const applyParsed = useCallback(
    (parsed: string[], mode: "append" | "replace") => {
      const newRows: MaterialLine[] = parsed.map((text) => ({
        id: newMaterialLineId(),
        text,
      }));
      if (mode === "replace") {
        void persist(newRows);
        return;
      }
      void persist([...lines, ...newRows]);
    },
    [lines, persist],
  );

  const importFromClipboard = useCallback(async () => {
    setBusy(true);
    try {
      const parsed = await parseMaterialListFromClipboard();
      if (!parsed) return;
      offerMaterialListImport(parsed, (mode) => applyParsed(parsed, mode));
    } finally {
      setBusy(false);
    }
  }, [applyParsed]);

  const importFromFile = useCallback(async () => {
    setBusy(true);
    try {
      const parsed = await parseMaterialListFromFile();
      if (!parsed) return;
      offerMaterialListImport(parsed, (mode) => applyParsed(parsed, mode));
    } finally {
      setBusy(false);
    }
  }, [applyParsed]);

  const addDraftLine = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    void persist([{ id: newMaterialLineId(), text }, ...lines]);
    setDraft("");
  }, [draft, lines, persist]);

  const removeLine = useCallback(
    (id: string) => {
      void persist(lines.filter((l) => l.id !== id));
    },
    [lines, persist],
  );

  const clearAll = useCallback(() => {
    Alert.alert("Clear entire list?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => void persist([]) },
    ]);
  }, [persist]);

  const openSaveModal = useCallback(() => {
    setNameDraft(defaultSavedMaterialListName());
    setNameModal({ kind: "save" });
  }, []);

  const openRenameModal = useCallback((record: SavedMaterialList) => {
    setNameDraft(record.name);
    setNameModal({ kind: "rename", id: record.id });
  }, []);

  const closeNameModal = useCallback(() => {
    setNameModal(null);
    setNameDraft("");
  }, []);

  const submitNameModal = useCallback(async () => {
    if (!nameModal) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Enter a name for this list.");
      return;
    }
    if (nameModal.kind === "save") {
      if (lines.length === 0) {
        closeNameModal();
        return;
      }
      await saveMaterialListSnapshot(trimmed, lines);
      refreshSavedLists();
      closeNameModal();
      Alert.alert("List saved", `"${trimmed}" is in your saved lists below.`);
      return;
    }
    const updated = await renameSavedMaterialList(nameModal.id, trimmed);
    if (updated) refreshSavedLists();
    closeNameModal();
  }, [closeNameModal, lines, nameDraft, nameModal, refreshSavedLists]);

  const applyLoadedSnapshot = useCallback(
    (record: SavedMaterialList) => {
      void persist(materialLinesFromSnapshot(record.items));
    },
    [persist],
  );

  const loadSavedList = useCallback(
    (record: SavedMaterialList) => {
      if (record.items.length === 0) {
        Alert.alert("Empty saved list", "This saved list has no items.");
        return;
      }
      if (lines.length === 0) {
        applyLoadedSnapshot(record);
        return;
      }
      Alert.alert(
        `Load "${record.name}"?`,
        `This replaces your current ${lines.length} item${lines.length === 1 ? "" : "s"}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace list",
            style: "destructive",
            onPress: () => applyLoadedSnapshot(record),
          },
        ],
      );
    },
    [applyLoadedSnapshot, lines.length],
  );

  const confirmDeleteSaved = useCallback(
    (record: SavedMaterialList) => {
      Alert.alert(`Delete "${record.name}"?`, "This only removes the saved copy. Your current list is unchanged.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteSavedMaterialList(record.id).then((ok) => {
              if (ok) refreshSavedLists();
            });
          },
        },
      ]);
    },
    [refreshSavedLists],
  );

  const openEmailModalForCurrent = useCallback(() => {
    const texts = lines.map((l) => l.text.trim()).filter((t) => t.length > 0);
    if (texts.length === 0) {
      Alert.alert("Nothing to email", "Add at least one line to your list first.");
      return;
    }
    setEmailJobRefDraft("");
    setEmailModal({ kind: "current" });
  }, [lines]);

  const openEmailModalForSaved = useCallback((record: SavedMaterialList) => {
    const texts = record.items.map((i) => i.text.trim()).filter((t) => t.length > 0);
    if (texts.length === 0) {
      Alert.alert("Empty saved list", "This saved list has no items to email.");
      return;
    }
    setEmailJobRefDraft("");
    setEmailModal({ kind: "saved", record });
  }, []);

  const closeEmailModal = useCallback(() => {
    setEmailModal(null);
    setEmailJobRefDraft("");
  }, []);

  const submitEmailModal = useCallback(async () => {
    if (!emailModal) return;
    const jobRef = emailJobRefDraft.trim();
    if (!jobRef) {
      Alert.alert(
        "PO # or job name required",
        "Enter a purchase order number or job name so this email is easy to identify.",
      );
      return;
    }
    const listTitle = emailModal.kind === "saved" ? emailModal.record.name : undefined;
    const texts =
      emailModal.kind === "current"
        ? lines.map((l) => l.text.trim()).filter((t) => t.length > 0)
        : emailModal.record.items.map((i) => i.text.trim()).filter((t) => t.length > 0);
    if (texts.length === 0) {
      closeEmailModal();
      return;
    }
    closeEmailModal();
    const ok = await composeMaterialListEmail({ listTitle, lineTexts: texts, jobRef });
    if (!ok) {
      Alert.alert("Could not open email", "Install a mail app or try again. Long lists open the share sheet instead.");
    }
  }, [closeEmailModal, emailJobRefDraft, emailModal, lines]);

  const modalTitle =
    nameModal?.kind === "rename" ? "Rename saved list" : "Save material list";

  useEffect(() => {
    if (!MATERIAL_LIST_SCREEN_DISABLED) return;
    alertComingSoon();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(HOME_FALLBACK_HREF);
    }
  }, [router]);

  if (MATERIAL_LIST_SCREEN_DISABLED) {
    return null;
  }

  return (
    <View style={styles.root}>
      <ScStickyScroll
        title="Material list"
        subtitle="Build a job list, save lists to reuse, or import from Notes or a .txt file."
        fallbackHref={HOME_FALLBACK_HREF}
        scrollStyle={styles.flex}
        contentContainerStyle={styles.scroll}
        scrollViewProps={{ keyboardShouldPersistTaps: "handled" }}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Saved lists</Text>
          {!savedLoaded ? (
            <Text style={styles.muted}>Loading saved lists…</Text>
          ) : savedLists.length === 0 ? (
            <Text style={styles.hint}>
              No saved lists yet. Add items, then tap Save list to keep a copy you can load later.
            </Text>
          ) : (
            savedLists.map((record) => (
              <View key={record.id} style={styles.savedRow}>
                <Pressable
                  onPress={() => loadSavedList(record)}
                  style={({ pressed }) => [styles.savedMain, pressed && styles.pressed]}
                >
                  <Text style={styles.savedName}>{record.name}</Text>
                  <Text style={styles.savedMeta}>
                    {formatSavedMaterialListDate(record.createdAt)} · {record.items.length} item
                    {record.items.length === 1 ? "" : "s"}
                  </Text>
                </Pressable>
                <View style={styles.savedActions}>
                  <Pressable
                    onPress={() => openRenameModal(record)}
                    style={({ pressed }) => [styles.savedActionBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.savedActionText}>Rename</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeleteSaved(record)}
                    style={({ pressed }) => [styles.savedActionBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.savedDeleteText}>Delete</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => openEmailModalForSaved(record)}
                  accessibilityRole="button"
                  accessibilityLabel={`Email saved list ${record.name}`}
                  accessibilityHint="Asks for a PO number or job name, then opens your mail app with this list."
                  style={({ pressed }) => [styles.emailSavedRow, pressed && styles.pressed]}
                >
                  <Text style={styles.emailSavedRowText}>Email this list</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add from Notes on your phone</Text>
          <Text style={styles.hint}>
            <Text style={styles.hintBold}>Clipboard:</Text> open Notes, select the list, Copy, then tap Paste from
            clipboard.
          </Text>
          <Text style={styles.hint}>
            <Text style={styles.hintBold}>File:</Text> in Notes use Share → Save to Files (choose a .txt), then tap
            Choose text file.
          </Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => void importFromClipboard()}
              disabled={busy}
              style={({ pressed }) => [styles.primaryBtn, busy && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.primaryBtnText}>Paste from clipboard</Text>
            </Pressable>
            <Pressable
              onPress={() => void importFromFile()}
              disabled={busy}
              style={({ pressed }) => [styles.secondaryBtn, busy && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryBtnText}>Choose text file</Text>
            </Pressable>
          </View>
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={colors.text} />
              <Text style={styles.muted}>Working…</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add one line</Text>
          <VoiceTextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. 12/2 NM-B 250 ft"
            placeholderTextColor={inputPlaceholder}
            style={styles.input}
            onSubmitEditing={addDraftLine}
            returnKeyType="done"
          />
          <Pressable
            onPress={addDraftLine}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>Add to list</Text>
          </Pressable>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{loaded ? `Items (${lines.length})` : "Items"}</Text>
          {lines.length > 0 ? (
            <Pressable onPress={clearAll} style={({ pressed }) => [styles.clearLink, pressed && styles.pressed]}>
              <Text style={styles.clearLinkText}>Clear all</Text>
            </Pressable>
          ) : null}
        </View>

        {!loaded ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : lines.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Your list is empty. Paste from Notes, load a saved list, or add lines above.</Text>
          </View>
        ) : (
          lines.map((row) => (
            <View key={row.id} style={styles.lineRow}>
              <Text style={styles.lineText}>{row.text}</Text>
              <Pressable onPress={() => removeLine(row.id)} style={({ pressed }) => [pressed && styles.pressed]}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}

        {lines.length > 0 ? (
          <View style={styles.bottomActions}>
            <Pressable
              onPress={openSaveModal}
              accessibilityRole="button"
              accessibilityLabel="Save list"
              accessibilityHint="Opens a dialog to name and store a copy of your current lines."
              style={({ pressed }) => [styles.saveListBtn, pressed && styles.pressed]}
            >
              <Text style={styles.saveListBtnText}>Save list</Text>
            </Pressable>
            <Pressable
              onPress={openEmailModalForCurrent}
              accessibilityRole="button"
              accessibilityLabel="Email material list"
              accessibilityHint="Asks for a PO number or job name, then opens your mail app with the list."
              style={({ pressed }) => [styles.secondaryBtn, styles.emailCurrentBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryBtnText}>Email list</Text>
            </Pressable>
          </View>
        ) : null}
      </ScStickyScroll>

      <Modal visible={nameModal !== null} transparent animationType="fade" onRequestClose={closeNameModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeNameModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <VoiceTextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="List name"
              placeholderTextColor={inputPlaceholder}
              style={styles.input}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={() => void submitNameModal()}
            />
            <View style={styles.row}>
              <Pressable
                onPress={closeNameModal}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitNameModal()}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.primaryBtnText}>{nameModal?.kind === "rename" ? "Rename" : "Save"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={emailModal !== null} transparent animationType="fade" onRequestClose={closeEmailModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeEmailModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Email material list</Text>
            <Text style={styles.modalHint}>
              Enter a <Text style={styles.modalHintBold}>PO #</Text> or <Text style={styles.modalHintBold}>job name</Text>{" "}
              so suppliers and your team can match this list to the right work.
            </Text>
            <VoiceTextInput
              value={emailJobRefDraft}
              onChangeText={setEmailJobRefDraft}
              placeholder="e.g. PO 28491 · Smith deck materials"
              placeholderTextColor={inputPlaceholder}
              style={styles.input}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={() => void submitEmailModal()}
            />
            <View style={styles.row}>
              <Pressable
                onPress={closeEmailModal}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitEmailModal()}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.primaryBtnText}>Send email</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const HINT_TEXT = "rgba(255,255,255,0.75)";

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const panel = navCardStyle(colors);
  const panelBg = tints.accentTint;
  const fieldInput = inputStyle(colors, tints);
  const outlineBtn = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: "transparent",
    },
    flex: { flex: 1 },
    scroll: {
      padding: 16,
      paddingBottom: 32,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
    },
    saveListBtn: {
      ...outlineBtn,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    saveListBtnText: {
      color: colors.text,
      fontWeight: "800",
      textAlign: "center",
      fontSize: 16,
    },
    bottomActions: {
      width: "100%",
      gap: 10,
      marginTop: 14,
    },
    emailCurrentBtn: {
      width: "100%",
      flexGrow: 0,
    },
    emailSavedRow: {
      ...outlineBtn,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "transparent",
      paddingVertical: 12,
      borderRadius: 0,
    },
    emailSavedRowText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 15,
    },
    card: {
      ...panel,
      borderRadius: 16,
      padding: 14,
      gap: 10,
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    hint: {
      fontSize: 13,
      lineHeight: 19,
      color: HINT_TEXT,
    },
    hintBold: {
      fontWeight: "700",
      color: colors.text,
    },
    savedRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: tints.accentTintLight,
      overflow: "hidden",
    },
    savedMain: {
      padding: 12,
      gap: 4,
    },
    savedName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    savedMeta: {
      fontSize: 13,
      color: HINT_TEXT,
    },
    savedActions: {
      flexDirection: "row",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "transparent",
    },
    savedActionBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: panelBg,
    },
    savedActionText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14,
    },
    savedDeleteText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14,
    },
    row: {
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 4,
    },
    primaryBtn: {
      ...outlineBtn,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexGrow: 1,
      minWidth: 120,
    },
    primaryBtnText: {
      color: colors.text,
      fontWeight: "800",
      textAlign: "center",
      fontSize: 15,
    },
    secondaryBtn: {
      ...outlineBtn,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexGrow: 1,
      minWidth: 120,
    },
    secondaryBtnText: {
      color: colors.text,
      fontWeight: "700",
      textAlign: "center",
      fontSize: 15,
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.88,
    },
    busyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    muted: {
      color: HINT_TEXT,
      fontSize: 14,
    },
    input: {
      ...fieldInput,
      paddingVertical: Platform.OS === "ios" ? 12 : 10,
      paddingHorizontal: 12,
    },
    listHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    clearLink: {
      ...outlineBtn,
      paddingVertical: 6,
      paddingHorizontal: 10,
      flexGrow: 0,
      minWidth: 0,
    },
    clearLinkText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14,
    },
    empty: {
      ...panel,
      padding: 18,
      borderRadius: 12,
    },
    emptyText: {
      color: HINT_TEXT,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
    },
    lineRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: panelBg,
      borderWidth: 1,
      borderColor: "transparent",
      marginBottom: 8,
    },
    lineText: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
    },
    removeText: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 14,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      padding: 24,
    },
    modalCard: {
      ...panel,
      borderRadius: 16,
      padding: 18,
      gap: 14,
      maxWidth: 420,
      width: "100%",
      alignSelf: "center",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    modalHint: {
      fontSize: 14,
      lineHeight: 20,
      color: HINT_TEXT,
    },
    modalHintBold: {
      fontWeight: "800",
      color: colors.text,
    },
  });
}
