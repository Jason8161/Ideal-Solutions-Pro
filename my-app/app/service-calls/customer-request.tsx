import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { StickyPageHeader, StickyScreenShell, ScreenScrollView, useScStyles } from "@/components/serviceCalls/screenChrome";
import {
  getAccentTints,
  inputStyle,
  placeholderTextColor,
  secondaryButtonStyle,
} from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  buildMailtoUrl,
  buildSmsUrl,
  CUSTOMER_REQUEST_CUSTOMER_CTA_LABEL,
  CUSTOMER_REQUEST_INVITE_COPY,
  emptyCustomerRequestPayload,
  parseContractorContactFromParams,
  type CustomerRequestPayload,
  validateCustomerRequest,
} from "@/lib/customerServiceRequest";

function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline,
  minHeight,
  formStyles,
  placeholderColor,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
  multiline?: boolean;
  minHeight?: number;
  formStyles: ReturnType<typeof makeFormStyles>;
  placeholderColor: string;
}) {
  return (
    <View style={formStyles.fieldBlock}>
      <Text style={formStyles.label}>{label}</Text>
      <VoiceTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        style={[formStyles.input, multiline && { minHeight: minHeight ?? 100, textAlignVertical: "top" }]}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  );
}

export default function CustomerRequestScreen() {
  const { width } = useWindowDimensions();
  const scStyles = useScStyles();
  const { colors } = useAppTheme();
  const formStyles = useMemo(() => makeFormStyles(colors), [colors]);
  const placeholderColor = useMemo(() => placeholderTextColor(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const contact = useMemo(() => parseContractorContactFromParams(params), [params]);
  const companyLabel = contact.companyName.trim() || "your contractor";

  const shellStyle = useMemo(
    () => ({
      width: "100%" as const,
      maxWidth: Math.min(560, Math.max(0, width - 8)),
      alignSelf: "center" as const,
    }),
    [width],
  );

  const [payload, setPayload] = useState<CustomerRequestPayload>(emptyCustomerRequestPayload);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const patch = useCallback((key: keyof CustomerRequestPayload, value: string) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goRequestReceived = useCallback(
    (via: "email" | "sms" | "email-and-text") => {
      router.replace({
        pathname: "/service-calls/request-received",
        params: { companyName: contact.companyName, via },
      });
    },
    [contact.companyName, router],
  );

  const submit = useCallback(async () => {
    const validationError = validateCustomerRequest(payload);
    if (validationError) {
      Alert.alert("Missing information", validationError);
      return;
    }

    const email = contact.contractorEmail.trim();
    if (!email) {
      Alert.alert(
        "Link incomplete",
        "This request link is missing the contractor email. Ask them to send a new link from their Ideal Solutions Pro app.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const mailto = buildMailtoUrl(email, payload, contact);
      const canEmail = await Linking.canOpenURL(mailto);
      if (!canEmail) {
        Alert.alert("Email not available", "Set up an email app on this device, or ask your contractor by phone.");
        return;
      }
      await Linking.openURL(mailto);
      goRequestReceived("email");
    } catch (e) {
      Alert.alert("Could not open email", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [contact, goRequestReceived, payload]);

  const sendEmailAndText = useCallback(async () => {
    const validationError = validateCustomerRequest(payload);
    if (validationError) {
      Alert.alert("Missing information", validationError);
      return;
    }

    const email = contact.contractorEmail.trim();
    const phone = contact.contractorPhone.trim();
    if (!email || !phone) {
      Alert.alert(
        "Need email and phone on this link",
        !email
          ? "Your contractor did not include an email address. Send by text only, or ask them to share an updated link from Ideal Solutions Pro."
          : "Your contractor did not include a phone number. Send by email only, or ask them to share an updated link.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const mailto = buildMailtoUrl(email, payload, contact);
      const canEmail = await Linking.canOpenURL(mailto);
      if (!canEmail) {
        Alert.alert("Email not available", "Set up an email app on this device, or send by text only.");
        return;
      }
      await Linking.openURL(mailto);

      const sms = buildSmsUrl(phone, payload);
      const canSms = await Linking.canOpenURL(sms);

      Alert.alert(
        "Next: text message",
        canSms
          ? "Send the email when you are ready. Then open your messages app to send the same request by text so your contractor sees both."
          : "Send the email when you are ready. SMS does not appear to be available on this device, so your contractor will only receive email if you send it.",
        canSms
          ? [
              {
                text: "Skip text",
                style: "cancel",
                onPress: () => goRequestReceived("email"),
              },
              {
                text: "Open Messages",
                onPress: () => {
                  void (async () => {
                    try {
                      await Linking.openURL(sms);
                    } catch {
                      Alert.alert("Could not open messages", "You can text your contractor manually.");
                    } finally {
                      goRequestReceived("email-and-text");
                    }
                  })();
                },
              },
            ]
          : [{ text: "OK", onPress: () => goRequestReceived("email") }],
      );
    } catch (e) {
      Alert.alert("Could not open email", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [contact, goRequestReceived, payload]);

  const sendSms = useCallback(async () => {
    const validationError = validateCustomerRequest(payload);
    if (validationError) {
      Alert.alert("Missing information", validationError);
      return;
    }

    const phone = contact.contractorPhone.trim();
    if (!phone) {
      Alert.alert("No contractor phone", "Your contractor did not include a phone number on this link. Use email instead.");
      return;
    }

    setSubmitting(true);
    try {
      const sms = buildSmsUrl(phone, payload);
      const canSms = await Linking.canOpenURL(sms);
      if (!canSms) {
        Alert.alert("Messaging not available", "SMS is not available on this device. Use email instead.");
        return;
      }
      await Linking.openURL(sms);
      goRequestReceived("sms");
    } catch (e) {
      Alert.alert("Could not open messages", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [contact, goRequestReceived, payload]);

  return (
    <View style={scStyles.screen}>
      {!showForm ? (
        <ScreenScrollView contentContainerStyle={[scStyles.content, landingStyles.landingScroll]}>
          <View style={shellStyle}>
            {contact.companyName.trim() ? (
              <Text style={[scStyles.subtitle, landingStyles.companyLine]}>{contact.companyName.trim()}</Text>
            ) : null}
            <Text style={[scStyles.title, landingStyles.prompt]}>{CUSTOMER_REQUEST_INVITE_COPY}</Text>
            <Pressable
              onPress={() => setShowForm(true)}
              style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel={CUSTOMER_REQUEST_CUSTOMER_CTA_LABEL}
            >
              <Text style={scStyles.primaryCtaText}>{CUSTOMER_REQUEST_CUSTOMER_CTA_LABEL}</Text>
            </Pressable>
          </View>
        </ScreenScrollView>
      ) : (
        <StickyScreenShell
          header={
            <StickyPageHeader
              showBack={false}
              title="Request a service call"
              subtitle={`Enter your details for ${companyLabel}. Choose email, text, or both — your app opens with everything filled in; tap Send in each app to reach them.`}
            />
          }
        >
          <FormScrollView
            style={scStyles.scrollBody}
            contentContainerStyle={scStyles.content}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
          >
            <View style={shellStyle}>
        <LabeledField
          label="Your name"
          value={payload.customerName}
          onChangeText={(t) => patch("customerName", t)}
          placeholder="Full name"
          autoCapitalize="words"
          formStyles={formStyles}
          placeholderColor={placeholderColor}
        />
        <LabeledField
          label="Phone"
          value={payload.phone}
          onChangeText={(t) => patch("phone", t)}
          placeholder="Best number to reach you"
          keyboardType="phone-pad"
          formStyles={formStyles}
          placeholderColor={placeholderColor}
        />
        <LabeledField
          label="Email"
          value={payload.email}
          onChangeText={(t) => patch("email", t)}
          placeholder="name@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          formStyles={formStyles}
          placeholderColor={placeholderColor}
        />
        <LabeledField
          label="Service address"
          value={payload.address}
          onChangeText={(t) => patch("address", t)}
          placeholder="Street, city, or job site"
          autoCapitalize="words"
          formStyles={formStyles}
          placeholderColor={placeholderColor}
        />

        <Text style={formStyles.label}>How soon do you need help?</Text>
        <Text style={formStyles.fieldHelp}>Pick one — this helps your contractor prioritize.</Text>
        <View style={formStyles.optionsCol}>
          <Pressable
            onPress={() => setPayload((prev) => ({ ...prev, urgency: "scheduled" }))}
            style={({ pressed }) => [
              formStyles.optionChip,
              payload.urgency === "scheduled" ? formStyles.optionChipSelected : null,
              pressed && formStyles.optionChipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: payload.urgency === "scheduled" }}
          >
            <Text
              style={[
                formStyles.optionTitle,
                payload.urgency === "scheduled" ? formStyles.optionTitleSelected : null,
              ]}
            >
              Can be scheduled
            </Text>
            <Text
              style={[
                formStyles.optionHint,
                payload.urgency === "scheduled" ? formStyles.optionHintSelected : null,
              ]}
            >
              Not urgent — a routine visit is fine
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPayload((prev) => ({ ...prev, urgency: "emergency" }))}
            style={({ pressed }) => [
              formStyles.optionChip,
              payload.urgency === "emergency" ? formStyles.optionChipEmergency : null,
              pressed && formStyles.optionChipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: payload.urgency === "emergency" }}
          >
            <Text
              style={[
                formStyles.optionTitle,
                payload.urgency === "emergency" ? formStyles.optionTitleEmergency : null,
              ]}
            >
              Emergency
            </Text>
            <Text
              style={[
                formStyles.optionHint,
                payload.urgency === "emergency" ? formStyles.optionHintEmergency : null,
              ]}
            >
              Needs prompt attention (safety, major leak, no heat, etc.)
            </Text>
          </Pressable>
        </View>

        <LabeledField
          label="Describe the problem"
          value={payload.problemDescription}
          onChangeText={(t) => patch("problemDescription", t)}
          placeholder="What needs service or repair?"
          multiline
          minHeight={120}
          formStyles={formStyles}
          placeholderColor={placeholderColor}
        />
        <LabeledField
          label="Preferred date / time (optional)"
          value={payload.preferredDateTime}
          onChangeText={(t) => patch("preferredDateTime", t)}
          placeholder="e.g. Weekday mornings, or Sat 3/15 after 2pm"
          formStyles={formStyles}
          placeholderColor={placeholderColor}
        />

        <Pressable
          onPress={() => void submit()}
          style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, submitting && { opacity: 0.6 }]}
          disabled={submitting}
        >
          <Text style={scStyles.primaryCtaText}>{submitting ? "Opening…" : "Send request by email"}</Text>
        </Pressable>

        {contact.contractorEmail.trim() && contact.contractorPhone.trim() ? (
          <Pressable
            onPress={() => void sendEmailAndText()}
            style={({ pressed }) => [
              scStyles.menuButton,
              scStyles.menuButtonSecondary,
              { marginTop: 12 },
              pressed && { opacity: 0.9 },
              submitting && { opacity: 0.6 },
            ]}
            disabled={submitting}
          >
            <Text style={scStyles.menuButtonSecondaryText}>Send by email and text message</Text>
          </Pressable>
        ) : null}

        {contact.contractorPhone.trim() ? (
          <Pressable
            onPress={() => void sendSms()}
            style={({ pressed }) => [
              scStyles.menuButton,
              scStyles.menuButtonSecondary,
              { marginTop: 12 },
              pressed && { opacity: 0.9 },
              submitting && { opacity: 0.6 },
            ]}
            disabled={submitting}
          >
            <Text style={scStyles.menuButtonSecondaryText}>Send request by text message</Text>
          </Pressable>
        ) : null}
            </View>
          </FormScrollView>
        </StickyScreenShell>
      )}
    </View>
  );
}

const landingStyles = StyleSheet.create({
  landingScroll: {
    paddingVertical: 32,
  },
  companyLine: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 15,
    fontWeight: "600",
  },
  prompt: {
    textAlign: "center",
    marginBottom: 28,
    fontSize: 22,
    lineHeight: 30,
  },
});

function makeFormStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const chipBase = secondaryButtonStyle(colors, tints);
  const fieldInput = inputStyle(colors, tints);

  return StyleSheet.create({
    fieldBlock: {
      marginBottom: 14,
    },
    label: {
      fontSize: 13,
      fontWeight: "800",
      color: tints.mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 6,
    },
    input: fieldInput,
    fieldHelp: {
      fontSize: 14,
      color: tints.mutedText,
      marginBottom: 10,
      lineHeight: 20,
    },
    optionsCol: {
      gap: 10,
      marginBottom: 18,
    },
    optionChip: {
      ...chipBase,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    optionChipSelected: {
      backgroundColor: tints.accentTintActive,
    },
    optionChipEmergency: {
      backgroundColor: hexToRgba(colors.accent, 0.32),
    },
    optionChipPressed: {
      opacity: 0.88,
    },
    optionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
    },
    optionTitleSelected: {
      color: colors.text,
    },
    optionTitleEmergency: {
      color: colors.accent,
    },
    optionHint: {
      fontSize: 14,
      color: tints.mutedText,
      marginTop: 4,
      lineHeight: 20,
    },
    optionHintSelected: {
      color: tints.mutedText,
    },
    optionHintEmergency: {
      color: hexToRgba(colors.accent, 0.85),
    },
  });
}
