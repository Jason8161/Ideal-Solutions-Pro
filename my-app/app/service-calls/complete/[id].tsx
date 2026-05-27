import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { FormScrollView, FORM_MULTILINE_EXTRA_SCROLL_HEIGHT } from "@/components/FormScrollView";
import { VoiceTextInput } from "@/components/VoiceTextInput";
import { StickyPageHeader, StickyScreenShell, useScStyles } from "@/components/serviceCalls/screenChrome";
import { inputStyle, placeholderTextColor } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { getServiceCallById, markServiceCallCompleted, serviceCallTitle } from "@/lib/serviceCallStorage";

type WizardStep = "complete100" | "satisfied" | "problem" | "fix";

function YesNoButtons({
  onYes,
  onNo,
}: {
  onYes: () => void;
  onNo: () => void;
}) {
  const scStyles = useScStyles();
  return (
    <View style={scStyles.yesNoRow}>
      <Pressable onPress={onYes} style={({ pressed }) => [scStyles.yesNoBtn, pressed && { opacity: 0.9 }]}>
        <Text style={scStyles.yesNoText}>Yes</Text>
      </Pressable>
      <Pressable onPress={onNo} style={({ pressed }) => [scStyles.yesNoBtn, pressed && { opacity: 0.9 }]}>
        <Text style={scStyles.yesNoText}>No</Text>
      </Pressable>
    </View>
  );
}

export default function CompleteServiceCallWizardScreen() {
  const scStyles = useScStyles();
  const { colors } = useAppTheme();
  const wizardStyles = useMemo(() => makeWizardStyles(colors), [colors]);
  const inputPlaceholder = useMemo(() => placeholderTextColor(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("complete100");
  const [customerName, setCustomerName] = useState("");
  const [problem, setProblem] = useState("");
  const [fix, setFix] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id || typeof id !== "string") return;
      void getServiceCallById(id).then((r) => {
        if (r) setCustomerName(serviceCallTitle(r));
        if (r?.status === "completed") {
          router.replace(`/service-calls/${id}`);
        }
      });
    }, [id, router]),
  );

  const finish = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    if (!problem.trim() || !fix.trim()) {
      Alert.alert("Required", "Enter both the problem and the fix before finishing.");
      return;
    }
    setSaving(true);
    try {
      await markServiceCallCompleted(id, {
        isFullyComplete: true,
        isCustomerSatisfied: true,
        problemDescription: problem.trim(),
        fixDescription: fix.trim(),
      });
      router.replace("/service-calls/completed");
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }, [fix, id, problem, router]);

  const onComplete100No = () => {
    Alert.alert(
      "Not complete yet",
      "Leave this call in Current service calls until the job is 100% complete.",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const onSatisfiedNo = () => {
    Alert.alert(
      "Customer not satisfied",
      "Resolve concerns with the customer before marking this call complete, or note the issue in your records.",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  return (
    <StickyScreenShell
      header={
        <StickyPageHeader
          title="Mark complete"
          subtitle={customerName || undefined}
          backHref={id ? `/service-calls/${id}` : "/service-calls/current"}
        />
      }
    >
      <FormScrollView
        style={scStyles.scrollBody}
        contentContainerStyle={scStyles.content}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
      >
        {step === "complete100" ? (
          <>
            <Text style={wizardStyles.question}>Is service call 100% complete?</Text>
            <YesNoButtons onYes={() => setStep("satisfied")} onNo={onComplete100No} />
          </>
        ) : null}

        {step === "satisfied" ? (
          <>
            <Text style={wizardStyles.question}>Is customer satisfied?</Text>
            <YesNoButtons onYes={() => setStep("problem")} onNo={onSatisfiedNo} />
          </>
        ) : null}

        {step === "problem" ? (
          <>
            <Text style={wizardStyles.question}>What was the problem?</Text>
            <VoiceTextInput
              value={problem}
              onChangeText={setProblem}
              placeholder="Describe the issue…"
              placeholderTextColor={inputPlaceholder}
              style={wizardStyles.textArea}
              multiline
              textAlignVertical="top"
            />
            {problem.trim().length > 0 ? (
              <Pressable
                onPress={() => setStep("fix")}
                style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }]}
              >
                <Text style={scStyles.primaryCtaText}>Continue</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {step === "fix" ? (
          <>
            <Text style={wizardStyles.question}>What was the fix?</Text>
            <VoiceTextInput
              value={fix}
              onChangeText={setFix}
              placeholder="Describe what you did to resolve it…"
              placeholderTextColor={inputPlaceholder}
              style={wizardStyles.textArea}
              multiline
              textAlignVertical="top"
            />
            {fix.trim().length > 0 ? (
              <Pressable
                onPress={() => void finish()}
                style={({ pressed }) => [
                  scStyles.primaryCta,
                  pressed && { opacity: 0.9 },
                  saving && { opacity: 0.6 },
                ]}
                disabled={saving}
              >
                <Text style={scStyles.primaryCtaText}>{saving ? "Saving…" : "Finish & move to completed"}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </FormScrollView>
    </StickyScreenShell>
  );
}

function makeWizardStyles(colors: ColorScheme) {
  return StyleSheet.create({
    question: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginTop: 24,
      lineHeight: 28,
    },
    textArea: {
      ...inputStyle(colors),
      marginTop: 16,
      minHeight: 120,
      textAlignVertical: "top",
    },
  });
}
