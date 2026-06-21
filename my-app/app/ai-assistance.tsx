import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { AiProjectHistoryModal } from "@/components/aiAssistance/AiProjectHistoryModal";
import {
  FormScrollView,
  FORM_MULTILINE_EXTRA_SCROLL_HEIGHT,
  useComposerKeyboardPadding,
} from "@/components/FormScrollView";
import { ImmersiveTextInput } from "@/components/ImmersiveTextInput";
import { AiUsageBanner } from "@/components/employeeAi/AiUsageBanner";
import {
  HOME_FALLBACK_HREF,
  ScreenBackButton,
  ServiceCallScreenHeader,
  StickyScreenShell,
  useScStyles,
} from "@/components/serviceCalls/screenChrome";
import { useImmersiveChrome } from "@/context/ImmersiveChromeContext";
import { useAppTheme } from "@/context/ThemeContext";
import { sendAiAssistanceMessage } from "@/lib/aiAssistanceClient";
import {
  createAiAssistanceProject,
  deleteAiAssistanceProject,
  deriveAiProjectTitle,
  loadAiAssistanceProjectsStore,
  renameAiAssistanceProject,
  setActiveAiAssistanceProjectId,
  saveAiAssistanceProjectsStore,
  upsertAiAssistanceProject,
  type AiAssistanceProject,
} from "@/lib/aiAssistanceProjectsStorage";
import { recordAiQuestion } from "@/lib/employeeAi/usageStorage";
import { useAiAccess } from "@/lib/employeeAi/useAiAccess";
import {
  AI_ASSISTANCE_QUICK_PROMPTS,
  AI_ASSISTANCE_STARTER_PROMPTS,
  type AiChatMessage,
} from "@/lib/aiAssistanceTypes";
import { INPUT_ACCENT_FILL_OPACITY } from "@/components/themed/screenChrome";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";
import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";

function nextId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type UiMessage = AiChatMessage & { id: string };

function toUiMessages(messages: AiChatMessage[]): UiMessage[] {
  return messages.map((m) => ({ id: nextId(), role: m.role, content: m.content }));
}

function toChatMessages(messages: UiMessage[]): AiChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

function buildProjectSnapshot(
  existing: AiAssistanceProject | undefined,
  projectId: string,
  messages: AiChatMessage[],
): AiAssistanceProject {
  const now = new Date().toISOString();
  const title = existing?.titleLocked
    ? existing.title
    : deriveAiProjectTitle(messages, existing?.title ?? "New conversation");
  return {
    id: projectId,
    title,
    messages,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    titleLocked: existing?.titleLocked,
  };
}

export default function AiAssistanceScreen() {
  const { colors } = useAppTheme();
  const { immersiveActive } = useImmersiveChrome();
  const { access, refresh } = useAiAccess();
  const scStyles = useScStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderColor = useMemo(() => hexToRgba(colors.text, 0.5), [colors.text]);
  const scrollRef = useRef<KeyboardAwareScrollView | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectsRef = useRef<AiAssistanceProject[]>([]);

  const [hydrated, setHydrated] = useState(false);
  const [projects, setProjects] = useState<AiAssistanceProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [trade, setTrade] = useState<string>("construction contractor");

  const immersiveComposer = immersiveActive || composerFocused || draft.trim().length > 0;
  const hasChat = messages.length > 0;
  const showUsageBanner = access && !immersiveComposer;
  const composerKeyboardPadding = useComposerKeyboardPadding();
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );

  const headerSubtitle = immersiveComposer
    ? undefined
    : hasChat
      ? activeProject?.title
      : "Ask about estimates, materials, building codes, service calls, jobsite issues, or running your contracting business.";

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    void loadCompanyProfile().then((stored) => {
      const profile = companyProfileFromPartial(stored);
      const name = profile.companyName.trim();
      if (name) setCompanyName(name);
      const businessType = profile.businessType.trim();
      if (businessType) setTrade(businessType);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const store = await loadAiAssistanceProjectsStore();
      if (cancelled) return;

      let nextProjects = store.projects;
      let nextActiveId = store.activeProjectId;

      if (!nextActiveId || !nextProjects.some((p) => p.id === nextActiveId)) {
        const created = createAiAssistanceProject();
        nextProjects = [created, ...nextProjects];
        nextActiveId = created.id;
        await saveAiAssistanceProjectsStore({ projects: nextProjects, activeProjectId: nextActiveId });
      }

      const active = nextProjects.find((p) => p.id === nextActiveId)!;
      setProjects(nextProjects);
      setActiveProjectId(nextActiveId);
      setMessages(toUiMessages(active.messages));
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd(true);
    });
  }, []);

  const persistActiveProject = useCallback(
    async (msgs: UiMessage[], projectId: string | null = activeProjectId) => {
      if (!projectId || !hydrated) return;
      const chatMessages = toChatMessages(msgs);
      const existing = projectsRef.current.find((p) => p.id === projectId);
      const snapshot = buildProjectSnapshot(existing, projectId, chatMessages);
      const nextProjects = await upsertAiAssistanceProject(snapshot);
      projectsRef.current = nextProjects;
      setProjects(nextProjects);
      await setActiveAiAssistanceProjectId(projectId);
    },
    [activeProjectId, hydrated],
  );

  useEffect(() => {
    if (!hydrated || !activeProjectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistActiveProject(messages, activeProjectId);
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [activeProjectId, hydrated, messages, persistActiveProject]);

  const openHistory = useCallback(() => {
    setHistoryOpen(true);
  }, []);

  const loadProject = useCallback(
    async (projectId: string) => {
      if (projectId === activeProjectId) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await persistActiveProject(messages, activeProjectId);
      const project = projectsRef.current.find((p) => p.id === projectId);
      if (!project) return;
      setActiveProjectId(projectId);
      setMessages(toUiMessages(project.messages));
      setDraft("");
      await saveAiAssistanceProjectsStore({ projects: projectsRef.current, activeProjectId: projectId });
      scrollToEnd();
    },
    [activeProjectId, messages, persistActiveProject, scrollToEnd],
  );

  const startNewProject = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persistActiveProject(messages, activeProjectId);

    const current = projectsRef.current.find((p) => p.id === activeProjectId);
    if (current && current.messages.length === 0) {
      setHistoryOpen(false);
      return;
    }

    const created = createAiAssistanceProject();
    const nextProjects = [created, ...projectsRef.current];
    projectsRef.current = nextProjects;
    setProjects(nextProjects);
    setActiveProjectId(created.id);
    setMessages([]);
    setDraft("");
    await saveAiAssistanceProjectsStore({ projects: nextProjects, activeProjectId: created.id });
    setHistoryOpen(false);
  }, [activeProjectId, messages, persistActiveProject]);

  const handleRenameProject = useCallback(async (projectId: string, title: string) => {
    const nextProjects = await renameAiAssistanceProject(projectId, title);
    setProjects(nextProjects);
  }, []);

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const store = await deleteAiAssistanceProject(projectId);
      projectsRef.current = store.projects;
      setProjects(store.projects);

      if (projectId !== activeProjectId) return;

      if (store.activeProjectId && store.projects.some((p) => p.id === store.activeProjectId)) {
        const next = store.projects.find((p) => p.id === store.activeProjectId)!;
        setActiveProjectId(store.activeProjectId);
        setMessages(toUiMessages(next.messages));
      } else {
        const created = createAiAssistanceProject();
        const nextProjects = [created, ...store.projects];
        setProjects(nextProjects);
        setActiveProjectId(created.id);
        setMessages([]);
        await saveAiAssistanceProjectsStore({ projects: nextProjects, activeProjectId: created.id });
      }
      setDraft("");
    },
    [activeProjectId],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      if (access && !access.check.allowed) {
        const showSubscribe =
          !access.isEmployee &&
          (access.ownerSubscriptionTier === "locked" || access.ownerSubscriptionTier === "side_hustle");
        Alert.alert(
          "AI limit reached",
          access.check.blockReason ??
            "You've reached fair-use limits. AI is included with your app subscription.",
          showSubscribe
            ? [
                { text: "Not now", style: "cancel" },
                {
                  text: "View plans",
                  onPress: () => router.push("/settings/subscribe" as Href),
                },
              ]
            : [{ text: "OK", style: "cancel" }],
        );
        return;
      }

      const userMsg: UiMessage = { id: nextId(), role: "user", content: trimmed };
      const history: AiChatMessage[] = messages.map(({ role, content }) => ({ role, content }));
      setMessages((prev) => [...prev, userMsg]);
      setDraft("");
      setLoading(true);
      scrollToEnd();

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const result = await sendAiAssistanceMessage(
        trimmed,
        history,
        {
          companyName,
          trade,
        },
        controller.signal,
      );

      setLoading(false);
      abortRef.current = null;

      if (!result.ok) {
        Alert.alert("AI Assistance", result.message);
        return;
      }

      await recordAiQuestion({
        actor: access?.actor ?? "owner",
        employeeId: access?.employeeId,
      });
      await refresh();

      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: result.reply }]);
      scrollToEnd();
    },
    [access, companyName, loading, messages, refresh, scrollToEnd, trade],
  );

  const onQuickPrompt = (prompt: string) => {
    void sendMessage(prompt);
  };

  const onComposerFocus = useCallback(() => {
    setComposerFocused(true);
    scrollToEnd();
  }, [scrollToEnd]);

  const onDraftChange = useCallback((text: string) => {
    setDraft(text);
  }, []);

  const onComposerBlur = useCallback(() => {
    setComposerFocused(false);
  }, []);

  return (
    <StickyScreenShell
      header={
        <View style={scStyles.stickyHeader}>
          <View style={styles.headerRow}>
            <ScreenBackButton fallbackHref={HOME_FALLBACK_HREF} label="← Back" />
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => void startNewProject()}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="New conversation"
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={26} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={openHistory}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Saved conversations"
              >
                <MaterialCommunityIcons name="history" size={26} color={colors.text} />
              </Pressable>
            </View>
          </View>
          {!immersiveComposer ? (
            <ServiceCallScreenHeader
              title="Ideal Solutions Pro AI Assistance"
              subtitle={headerSubtitle}
              compact
            />
          ) : null}
        </View>
      }
    >
      <AiProjectHistoryModal
        visible={historyOpen}
        projects={projects}
        activeProjectId={activeProjectId}
        onClose={() => setHistoryOpen(false)}
        onSelect={(id) => void loadProject(id)}
        onNewProject={() => void startNewProject()}
        onRename={(id, title) => void handleRenameProject(id, title)}
        onDelete={(id) => void handleDeleteProject(id)}
      />
      <View style={styles.body}>
        {showUsageBanner ? (
          <AiUsageBanner
            check={access.check}
            isEmployee={access.isEmployee}
            ownerSubscriptionTier={access.ownerSubscriptionTier}
            crewAiIncluded={access.crewAiIncluded}
            hideUpgrade={access.crewAiIncluded}
          />
        ) : null}

        <FormScrollView
          innerRef={(ref) => {
            scrollRef.current = ref;
          }}
          style={[scStyles.scrollBody, styles.chatScroll]}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          keyboardDismissMode="interactive"
          enableAutomaticScroll={false}
          extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT + 72}
          onContentSizeChange={scrollToEnd}
        >
          <View style={styles.chatMain}>
            {!hasChat ? (
              <View style={styles.starterList}>
                <Text style={scStyles.sectionLabel}>Try asking</Text>
                {AI_ASSISTANCE_STARTER_PROMPTS.map((item) => (
                  <Pressable
                    key={item.label}
                    style={({ pressed }) => [
                      scStyles.menuButtonSecondary,
                      styles.starterRow,
                      pressed && styles.pressed,
                      loading && styles.starterRowDisabled,
                    ]}
                    onPress={() => onQuickPrompt(item.message)}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <Text style={scStyles.menuButtonSecondaryText}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {messages.map((m) => (
              <View
                key={m.id}
                style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}
              >
                <Text
                  style={[
                    styles.bubbleRole,
                    m.role === "user" ? styles.bubbleRoleUser : styles.bubbleRoleAssistant,
                  ]}
                >
                  {m.role === "user" ? "You" : "Assistant"}
                </Text>
                <Text style={styles.bubbleText}>{m.content}</Text>
              </View>
            ))}

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.loadingText}>Thinking… (may take up to a minute)</Text>
              </View>
            ) : null}
          </View>
        </FormScrollView>

        <View
          style={[
            styles.composerDock,
            composerKeyboardPadding > 0 && { paddingBottom: composerKeyboardPadding },
          ]}
        >
          {hasChat ? (
            <View style={styles.quickPromptsWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPrompts}
                keyboardShouldPersistTaps="handled"
              >
                {AI_ASSISTANCE_QUICK_PROMPTS.map((p) => (
                  <Pressable
                    key={p}
                    style={({ pressed }) => [
                      styles.quickChip,
                      pressed && styles.pressed,
                      loading && styles.quickChipDisabled,
                    ]}
                    onPress={() => onQuickPrompt(p)}
                    disabled={loading}
                  >
                    <Text style={styles.quickChipText} numberOfLines={2}>
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.composer}>
            <ImmersiveTextInput
              style={styles.input}
              value={draft}
              onChangeText={onDraftChange}
              onFocus={onComposerFocus}
              onBlur={onComposerBlur}
              placeholder="Ask a job, code, or business question…"
              placeholderTextColor={placeholderColor}
              multiline
              maxLength={8000}
              editable={!loading && (access?.check.allowed ?? true)}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && styles.pressed,
                (!draft.trim() || loading || access?.check.atLimit) && styles.sendBtnDisabled,
              ]}
              onPress={() => void sendMessage(draft)}
              disabled={!draft.trim() || loading || (access?.check.atLimit ?? false)}
              accessibilityLabel="Send message"
            >
              <MaterialCommunityIcons name="send" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>
    </StickyScreenShell>
  );
}

function makeStyles(colors: ColorScheme) {
  const accentTint = hexToRgba(colors.accent, 0.22);
  const accentTintLight = hexToRgba(colors.accent, 0.12);
  const inputFill = hexToRgba(colors.accent, INPUT_ACCENT_FILL_OPACITY);
  const accentTintActive = hexToRgba(colors.accent, 0.38);
  const mutedText = hexToRgba(colors.text, 0.72);

  return StyleSheet.create({
    body: {
      flex: 1,
      minHeight: 0,
      backgroundColor: "transparent",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    headerIconBtn: {
      padding: 8,
      borderRadius: 12,
    },
    chatScroll: { flex: 1 },
    chatContent: { padding: 16, paddingBottom: 8, gap: 12 },
    chatMain: { gap: 12 },
    starterList: { gap: 0, marginBottom: 8 },
    starterRow: { marginBottom: 10 },
    starterRowDisabled: { opacity: 0.5 },
    bubble: {
      maxWidth: "92%",
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: "transparent",
    },
    bubbleUser: {
      alignSelf: "flex-end",
      backgroundColor: accentTintActive,
    },
    bubbleAssistant: {
      alignSelf: "flex-start",
      backgroundColor: accentTint,
    },
    bubbleRole: { fontSize: 11, fontWeight: "800", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },
    bubbleRoleUser: { color: colors.text, opacity: 0.85 },
    bubbleRoleAssistant: { color: colors.text, opacity: 0.85 },
    bubbleText: { fontSize: 15, lineHeight: 21, color: colors.text },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
    loadingText: { color: mutedText, fontSize: 14 },
    composerDock: {
      borderTopWidth: 1,
      borderTopColor: "transparent",
    },
    quickPromptsWrap: {
      paddingVertical: 10,
    },
    quickPrompts: { paddingHorizontal: 16, gap: 8 },
    quickChip: {
      maxWidth: 200,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: accentTintLight,
      borderWidth: 1,
      borderColor: "transparent",
    },
    quickChipDisabled: { opacity: 0.5 },
    quickChipText: { fontSize: 13, fontWeight: "700", color: colors.text, opacity: 0.9 },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: "transparent",
      backgroundColor: "transparent",
    },
    input: {
      flex: 1,
      minHeight: 72,
      maxHeight: 160,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.22),
      backgroundColor: inputFill,
      color: colors.text,
      fontSize: 17,
      lineHeight: 24,
      paddingHorizontal: 16,
      paddingVertical: 14,
      textAlignVertical: "top",
    },
    sendBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: accentTint,
      borderWidth: 1,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.45 },
    pressed: { opacity: 0.88 },
  });
}
