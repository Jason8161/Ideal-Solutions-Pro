import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { ensureBossCloudCompany } from "@/lib/cloud/bossCompany";
import { loadBossCloudSession } from "@/lib/cloud/bossSession";
import { createCloudInvite, hasCloudApi, listCloudInvites } from "@/lib/cloud/client";
import type { CloudInvite } from "@/lib/cloud/types";
import { buildEmployeeAppInviteMessage, type EmployeeInviteRecipient } from "@/lib/employeeAppInvite";
import { loadEmployeeInviteContext } from "@/lib/employeeAppInvite";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { getAccentTints, inputStyle, navCardStyle } from "@/components/themed/screenChrome";

export function CrewCloudInvites() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [ready, setReady] = useState(false);
  const [bossToken, setBossToken] = useState<string | null>(null);
  const [invites, setInvites] = useState<CloudInvite[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const cloudConfigured = hasCloudApi();

  const refresh = useCallback(async () => {
    if (!cloudConfigured) {
      setReady(true);
      return;
    }
    try {
      const session = (await loadBossCloudSession()) ?? (await ensureBossCloudCompany());
      if (!session) {
        setBossToken(null);
        return;
      }
      setBossToken(session.bossToken);
      const rows = await listCloudInvites(session.bossToken);
      setInvites(rows.slice(0, 8));
    } catch {
      setBossToken(null);
    } finally {
      setReady(true);
    }
  }, [cloudConfigured]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreate = async () => {
    if (!bossToken) {
      Alert.alert("Cloud", "Could not connect company to the server. Check EXPO_PUBLIC_PRICING_API_URL.");
      return;
    }
    setBusy(true);
    try {
      const { invite, inviteLink } = await createCloudInvite(bossToken, {
        phone: phone.trim(),
        email: email.trim(),
      });
      setPhone("");
      setEmail("");
      await refresh();
      const context = await loadEmployeeInviteContext();
      const recipient: EmployeeInviteRecipient = {
        phone: invite.phone,
        email: invite.email,
      };
      const message = buildEmployeeAppInviteMessage(recipient, context, {
        inviteCode: invite.code,
        inviteLink: inviteLink ?? undefined,
      });
      Alert.alert("Invite created", `Code: ${invite.code}`, [
        { text: "Copy later", style: "cancel" },
        {
          text: "Share",
          onPress: () => void Share.share({ message, title: "Employee invite" }),
        },
      ]);
    } catch (e) {
      Alert.alert("Invite failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!cloudConfigured) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Cloud crew invites</Text>
        <Text style={styles.hint}>
          Set EXPO_PUBLIC_PRICING_API_URL to your pricing-backend host to create invite codes and links for the employee
          app.
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cloud crew invites</Text>
      <Text style={styles.hint}>
        Create a unique code and link. Employees join under Employee → Enter invite code (or open the link).
      </Text>
      <VoiceTextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone (optional)"
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={styles.input}
        keyboardType="phone-pad"
      />
      <VoiceTextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email (optional)"
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }, busy && { opacity: 0.55 }]}
        onPress={() => void onCreate()}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Create invite code</Text>
        )}
      </Pressable>
      {invites.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listTitle}>Recent invites</Text>
          {invites.map((inv) => (
            <Text key={inv.id} style={styles.listRow}>
              {inv.code}
              {inv.redeemedAt ? " · used" : " · open"}
              {inv.expiresAt ? ` · exp ${new Date(inv.expiresAt).toLocaleDateString()}` : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  return StyleSheet.create({
    card: {
      ...navCardStyle(colors),
      padding: 14,
      marginBottom: 20,
      gap: 8,
    },
    title: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
    hint: { fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.75)" },
    input: { ...inputStyle(colors, tints), fontSize: 16 },
    btn: {
      backgroundColor: colors.accent,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 4,
    },
    btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
    list: { marginTop: 8, gap: 4 },
    listTitle: { fontSize: 12, fontWeight: "700", color: colors.text, opacity: 0.8 },
    listRow: { fontSize: 13, color: "rgba(255,255,255,0.85)" },
  });
}
