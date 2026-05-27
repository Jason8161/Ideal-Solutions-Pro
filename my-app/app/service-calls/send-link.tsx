import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, Share, Text, View } from "react-native";

import { ScStickyScroll, useScStyles } from "@/components/serviceCalls/screenChrome";
import {
  buildCustomerInviteMailtoUrl,
  buildCustomerInviteShareBody,
  buildCustomerInviteSmsUrl,
  buildCustomerRequestLink,
  CUSTOMER_REQUEST_SHARE_SHEET_TITLE,
  type ContractorContactInLink,
} from "@/lib/customerServiceRequest";
import { getOrCreateContractorRequestToken } from "@/lib/contractorRequestToken";
import { loadCompanyProfile } from "@/lib/profileStorage";
import { getServiceRequestApiBaseUrl } from "@/lib/serviceRequestApi";
import {
  hasServiceRequestRecipient,
  parseServiceRequestRecipient,
} from "@/lib/serviceRequestRecipient";

export default function SendCustomerServiceLinkScreen() {
  const scStyles = useScStyles();
  const router = useRouter();
  const params = useLocalSearchParams();
  const recipient = useMemo(() => parseServiceRequestRecipient(params), [params]);
  const hasRecipient = hasServiceRequestRecipient(recipient);
  const [busy, setBusy] = useState<"text" | "email" | "copy" | null>(null);

  const prepare = useCallback(async (): Promise<{
    contact: ContractorContactInLink;
    token: string;
  } | null> => {
    const profile = await loadCompanyProfile();
    const email = (profile?.supportEmail ?? "").trim();
    if (!email) {
      Alert.alert(
        "Business email needed",
        "Add your support email under Settings → User info so customers can reach you.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open settings", onPress: () => router.push("/settings/user-info") },
        ],
      );
      return null;
    }
    const contact: ContractorContactInLink = {
      contractorEmail: email,
      contractorPhone: (profile?.phoneNumber ?? "").trim(),
      companyName: (profile?.companyName ?? "").trim(),
    };
    const token = await getOrCreateContractorRequestToken();
    return { contact, token };
  }, [router]);

  const shareGeneric = useCallback(
    async (body: string) => {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: CUSTOMER_REQUEST_SHARE_SHEET_TITLE, text: body });
        return;
      }
      await Share.share({ title: CUSTOMER_REQUEST_SHARE_SHEET_TITLE, message: body });
    },
    [],
  );

  const sendText = useCallback(async () => {
    setBusy("text");
    try {
      const ctx = await prepare();
      if (!ctx) return;
      const { contact, token } = ctx;
      const body = buildCustomerInviteShareBody(contact, token);
      const phone = recipient.phone.trim();
      if (Platform.OS !== "web") {
        const sms = buildCustomerInviteSmsUrl(contact, token, phone || undefined);
        const can = await Linking.canOpenURL(sms);
        if (can) {
          await Linking.openURL(sms);
          return;
        }
      }
      await shareGeneric(body);
    } catch (e) {
      if (e instanceof Error && /cancel|dismiss/i.test(e.message)) return;
      Alert.alert("Could not share", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }, [prepare, recipient.phone, shareGeneric]);

  const sendEmail = useCallback(async () => {
    setBusy("email");
    try {
      const ctx = await prepare();
      if (!ctx) return;
      const { contact, token } = ctx;
      const mailto = buildCustomerInviteMailtoUrl(contact, token, recipient.email.trim() || undefined);
      const can = await Linking.canOpenURL(mailto);
      if (can) {
        await Linking.openURL(mailto);
        return;
      }
      await shareGeneric(buildCustomerInviteShareBody(contact, token));
    } catch (e) {
      if (e instanceof Error && /cancel|dismiss/i.test(e.message)) return;
      Alert.alert("Could not open email", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }, [prepare, recipient.email, shareGeneric]);

  const copyLink = useCallback(async () => {
    setBusy("copy");
    try {
      const ctx = await prepare();
      if (!ctx) return;
      const link = buildCustomerRequestLink(ctx.contact, ctx.token);
      await Clipboard.setStringAsync(link);
      Alert.alert("Copied", "Request Service link copied. Paste into a text or email.");
    } catch (e) {
      Alert.alert("Could not copy", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }, [prepare]);

  const apiHint = getServiceRequestApiBaseUrl()
    ? "Customers submit in the browser; new requests sync into Current service calls."
    : "Set EXPO_PUBLIC_PRICING_API_URL to your pricing-backend host so the link opens the hosted form and syncs into Service Calls.";

  return (
    <ScStickyScroll
      backHref="/service-calls"
      title="Send Customer Service Call Link"
      subtitle="Choose text or email. Your customer opens Request Service in their mobile browser — no app, no login."
    >
      {hasRecipient ? (
        <View style={[scStyles.card, { marginBottom: 12 }]}>
          <Text style={scStyles.cardTitle}>Sending to</Text>
          {recipient.name.trim() ? <Text style={scStyles.cardMeta}>{recipient.name.trim()}</Text> : null}
          {recipient.phone.trim() ? <Text style={scStyles.cardMeta}>{recipient.phone.trim()}</Text> : null}
          {recipient.email.trim() ? <Text style={scStyles.cardMeta}>{recipient.email.trim()}</Text> : null}
        </View>
      ) : null}
      <Text style={[scStyles.subtitle, { marginBottom: 16 }]}>{apiHint}</Text>

      <Pressable
        onPress={() => void sendText()}
        disabled={busy !== null}
        style={({ pressed }) => [scStyles.menuButton, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}
      >
        <Text style={scStyles.menuButtonText}>{busy === "text" ? "Opening…" : "Send by text message"}</Text>
      </Pressable>

      <Pressable
        onPress={() => void sendEmail()}
        disabled={busy !== null}
        style={({ pressed }) => [
          scStyles.menuButton,
          scStyles.menuButtonSecondary,
          { marginTop: 12 },
          pressed && { opacity: 0.9 },
          busy && { opacity: 0.6 },
        ]}
      >
        <Text style={scStyles.menuButtonSecondaryText}>
          {busy === "email" ? "Opening…" : "Send by email"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => void copyLink()}
        disabled={busy !== null}
        style={({ pressed }) => [
          scStyles.menuButton,
          scStyles.menuButtonSecondary,
          { marginTop: 12 },
          pressed && { opacity: 0.9 },
          busy && { opacity: 0.6 },
        ]}
      >
        <Text style={scStyles.menuButtonSecondaryText}>
          {busy === "copy" ? "Copying…" : "Copy Request Service link"}
        </Text>
      </Pressable>
    </ScStickyScroll>
  );
}
