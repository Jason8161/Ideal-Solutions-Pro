import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, inputStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { listCloudMessages, sendCloudMessage } from "@/lib/cloud/client";
import type { CloudMessage } from "@/lib/cloud/types";
import { loadEmployeeSession } from "@/lib/employeeSession";

const POLL_MS = 12_000;
const CHANNEL = { type: "team" as const, id: "default" };

export default function EmployeeMessagesScreen() {
  const { scStyles } = useBossManChrome();
  const { colors } = useAppTheme();
  const fieldInput = useMemo(() => inputStyle(colors, getAccentTints(colors)), [colors]);
  const [messages, setMessages] = useState<CloudMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const sinceRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    const session = await loadEmployeeSession();
    const auth = session.cloudAuthToken ?? null;
    setToken(auth);
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const rows = await listCloudMessages(auth, CHANNEL.type, CHANNEL.id, sinceRef.current);
      if (rows.length) {
        sinceRef.current = rows[rows.length - 1]?.createdAt;
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of rows) {
            if (!ids.has(m.id)) merged.push(m);
          }
          return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        });
      }
    } catch (e) {
      if (messages.length === 0) {
        Alert.alert("Messages", e instanceof Error ? e.message : "Could not load messages.");
      }
    } finally {
      setLoading(false);
    }
  }, [messages.length]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || !token) return;
    setSending(true);
    try {
      const msg = await sendCloudMessage(token, CHANNEL.type, CHANNEL.id, body);
      setDraft("");
      setMessages((prev) => [...prev, msg]);
      sinceRef.current = msg.createdAt;
    } catch (e) {
      Alert.alert("Send failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSending(false);
    }
  };

  if (!token) {
    return (
      <ScStickyScroll backHref="/employee" title="Team chat" subtitle="Connect with an invite to use messages.">
        <Text style={scStyles.emptyText}>Sign in with an invite code from Settings → My crew.</Text>
      </ScStickyScroll>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScStickyScroll backHref="/employee" title="Team chat" subtitle="REST + polling (realtime in phase 2).">
        {loading && messages.length === 0 ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={scStyles.emptyText}>No messages yet. Say hello to the team.</Text>}
            renderItem={({ item }) => (
              <View style={[scStyles.menuButton, { marginBottom: 8, padding: 12 }]}>
                <Text style={scStyles.menuButtonText}>{item.body}</Text>
                <Text style={scStyles.emptyText}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            )}
          />
        )}
        <VoiceTextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message the team…"
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={[fieldInput, { marginTop: 12, marginBottom: 8 }]}
          multiline
        />
        <Pressable
          style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, sending && { opacity: 0.6 }]}
          onPress={() => void onSend()}
          disabled={sending}
        >
          <Text style={scStyles.primaryCtaText}>Send</Text>
        </Pressable>
      </ScStickyScroll>
    </View>
  );
}
