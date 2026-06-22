import { Redirect, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";

import { VoiceTextInput } from "@/components/VoiceTextInput";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { getAccentTints, inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { ensureBossCloudCompany } from "@/lib/cloud/bossCompany";
import { createCloudInvite, hasCloudApi } from "@/lib/cloud/client";
import { loadBossCloudSession } from "@/lib/cloud/bossSession";
import {
  buildEmployeeAppInviteMessage,
  loadEmployeeInviteContext,
  openEmployeeAppInviteEmail,
  openEmployeeAppInviteSms,
} from "@/lib/employeeAppInvite";
import { appendCrewActivity } from "@/lib/crew/activityLog";
import { buildEmployeeInviteDeepLink, getOrCreateInviteCode } from "@/lib/crew/inviteCodes";
import {
  createEmployee,
  employeeDisplayName,
  listEmployees,
  employeeToInput,
  updateEmployee,
} from "@/lib/employees/employeeStorage";
import type { Employee } from "@/lib/employees/types";
import { canAccessCrewTools } from "@/lib/subscriptionGating";

export default function CrewInviteScreen() {
  const { activeTier } = useSubscription();
  const { scStyles, styles } = useBossManChrome();
  const { colors } = useAppTheme();
  const fieldInput = inputStyle(colors, getAccentTints(colors));
  const { employeeId } = useLocalSearchParams<{ employeeId?: string }>();

  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [cloudInviteCode, setCloudInviteCode] = useState<string | null>(null);
  const [cloudInviteLink, setCloudInviteLink] = useState<string | null>(null);
  const [busyCloud, setBusyCloud] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    typeof employeeId === "string" ? employeeId : null,
  );
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void listEmployees("current").then(setEmployees);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const selected = employees.find((e) => e.id === selectedId) ?? employees[0] ?? null;

  useEffect(() => {
    if (selected) {
      setSelectedId(selected.id);
      void getOrCreateInviteCode(selected.id).then((code) => {
        setInviteCode(code);
        setInviteLink(buildEmployeeInviteDeepLink(code));
      });
    }
  }, [selected?.id]);

  if (!canAccessCrewTools(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  const onShareLink = async () => {
    if (!selected || !inviteCode || !inviteLink) return;
    const context = await loadEmployeeInviteContext();
    const message = buildEmployeeAppInviteMessage(
      selected,
      context,
      { inviteCode, inviteLink },
    );
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "Employee app invite", text: message });
    } else {
      await Share.share({ message });
    }
    await appendCrewActivity({
      type: "invite_sent",
      message: `Invite shared with ${employeeDisplayName(selected)}`,
      employeeId: selected.id,
    });
    void updateEmployee(selected.id, {
      ...employeeToInput(selected),
      inviteStatus: "sent",
    });
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    Alert.alert("Copied", "Invite link copied to clipboard.");
  };

  const onAddAndInvite = async () => {
    try {
      const created = await createEmployee({
        firstName: newFirst,
        lastName: newLast,
        phone: newPhone,
        email: newEmail,
        payType: "hourly",
        status: "current",
        role: "technician",
        inviteStatus: "pending",
      });
      setSelectedId(created.id);
      setNewFirst("");
      setNewLast("");
      setNewPhone("");
      setNewEmail("");
      refresh();
      Alert.alert("Employee added", `${employeeDisplayName(created)} is on your crew list. Send an invite below.`);
    } catch (e) {
      Alert.alert("Could not add", e instanceof Error ? e.message : "Check name fields.");
    }
  };

  const onCreateCloudInvite = async () => {
    if (!selected) {
      Alert.alert("Select employee", "Choose or add a crew member first.");
      return;
    }
    if (!hasCloudApi()) {
      Alert.alert(
        "Cloud API",
        "Set EXPO_PUBLIC_PRICING_API_URL to enable workspace invites. Local QR/link still works offline.",
      );
      return;
    }
    setBusyCloud(true);
    try {
      await ensureBossCloudCompany();
      const boss = await loadBossCloudSession();
      if (!boss?.bossToken) throw new Error("Boss workspace not linked.");
      const { invite, inviteLink } = await createCloudInvite(boss.bossToken, {
        phone: selected.phone,
        email: selected.email,
        localEmployeeId: selected.id,
        firstName: selected.firstName,
        lastName: selected.lastName,
      });
      setCloudInviteCode(invite.code);
      setCloudInviteLink(inviteLink);
      if (inviteLink) setInviteLink(inviteLink);
      if (invite.code) setInviteCode(invite.code);
      await appendCrewActivity({
        type: "invite_sent",
        message: `Cloud invite for ${employeeDisplayName(selected)}`,
        employeeId: selected.id,
      });
      Alert.alert("Invite created", `Code: ${invite.code}`);
    } catch (e) {
      Alert.alert("Cloud invite failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusyCloud(false);
    }
  };

  return (
    <ScStickyScroll
      backHref="/job-folder/crew"
      title="Invite to employee app"
      subtitle="Add crew (role: field employee), then share QR, link, SMS, or email."
    >
      <Text style={[scStyles.subtitle, { fontWeight: "800" }]}>Add new employee</Text>
      <VoiceTextInput
        value={newFirst}
        onChangeText={setNewFirst}
        placeholder="First name"
        placeholderTextColor={placeholderTextColor}
        style={[fieldInput, { marginBottom: 8 }]}
      />
      <VoiceTextInput
        value={newLast}
        onChangeText={setNewLast}
        placeholder="Last name"
        placeholderTextColor={placeholderTextColor}
        style={[fieldInput, { marginBottom: 8 }]}
      />
      <VoiceTextInput
        value={newPhone}
        onChangeText={setNewPhone}
        placeholder="Phone"
        placeholderTextColor={placeholderTextColor}
        keyboardType="phone-pad"
        style={[fieldInput, { marginBottom: 8 }]}
      />
      <VoiceTextInput
        value={newEmail}
        onChangeText={setNewEmail}
        placeholder="Email"
        placeholderTextColor={placeholderTextColor}
        keyboardType="email-address"
        autoCapitalize="none"
        style={[fieldInput, { marginBottom: 12 }]}
      />
      <Pressable style={styles.actionBtn} onPress={() => void onAddAndInvite()}>
        <Text style={scStyles.menuButtonText}>Save to crew (employee role)</Text>
      </Pressable>

      <Text style={[scStyles.subtitle, { fontWeight: "800", marginTop: 20 }]}>Select employee</Text>
      {employees.length === 0 ? (
        <Text style={scStyles.subtitle}>Add employees under Settings → My crew first.</Text>
      ) : (
        employees.map((e) => (
          <Pressable
            key={e.id}
            style={[styles.navRow, selectedId === e.id && styles.badgeAccent]}
            onPress={() => setSelectedId(e.id)}
          >
            <Text style={scStyles.menuButtonText}>{employeeDisplayName(e)}</Text>
            <Text style={scStyles.subtitle}>{e.phone?.trim() || e.email?.trim() || "No contact"}</Text>
          </Pressable>
        ))
      )}

      {selected && inviteLink && inviteCode ? (
        <View style={[styles.navRow, { alignItems: "center", gap: 12 }]}>
          <QRCode value={inviteLink} size={160} backgroundColor="transparent" color="#ffffff" />
          <Text style={scStyles.subtitle}>Invite code: {inviteCode}</Text>
          <Text style={scStyles.subtitle} numberOfLines={2}>
            {inviteLink}
          </Text>
          <Pressable style={styles.actionBtn} onPress={() => void copyLink()}>
            <Text style={scStyles.menuButtonText}>Copy link</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => void onShareLink()}>
            <Text style={scStyles.menuButtonText}>Share invite</Text>
          </Pressable>
          {hasCloudApi() ? (
            <Pressable
              style={[styles.actionBtn, busyCloud && { opacity: 0.6 }]}
              onPress={() => void onCreateCloudInvite()}
              disabled={busyCloud}
            >
              <Text style={scStyles.menuButtonText}>
                {busyCloud ? "Creating cloud invite…" : "Create cloud workspace invite"}
              </Text>
            </Pressable>
          ) : null}
          {cloudInviteCode ? (
            <Text style={scStyles.subtitle}>Cloud code: {cloudInviteCode}</Text>
          ) : null}
          {cloudInviteLink ? (
            <Text style={scStyles.subtitle} numberOfLines={2}>
              Cloud link: {cloudInviteLink}
            </Text>
          ) : null}
          <Pressable
            style={styles.actionBtn}
            onPress={() =>
              void openEmployeeAppInviteSms({
                firstName: selected.firstName,
                lastName: selected.lastName,
                phone: selected.phone,
                email: selected.email,
              })
            }
          >
            <Text style={scStyles.menuButtonText}>Send by text</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() =>
              void openEmployeeAppInviteEmail({
                firstName: selected.firstName,
                lastName: selected.lastName,
                phone: selected.phone,
                email: selected.email,
              })
            }
          >
            <Text style={scStyles.menuButtonText}>Send by email</Text>
          </Pressable>
        </View>
      ) : null}
    </ScStickyScroll>
  );
}
