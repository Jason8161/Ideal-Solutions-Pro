import { Link, router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { AiToolButton } from "@/components/aiAssistant/AiToolButton";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import {
  hasSeenAiAssistantOnboarding,
  markAiAssistantOnboardingSeen,
} from "@/lib/aiAssistant";
import { hexToRgba, type ColorScheme } from "@/lib/colorSchemeStorage";
import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";
import {
  partitionAiAssistantTools,
  suggestedForSectionTitle,
  tradeAiEmptyHint,
} from "@/lib/tradeAiSuggestions";

export function AiAssistantHub() {
  const { scStyles } = useBossManChrome();
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [businessType, setBusinessType] = useState("");

  useEffect(() => {
    void loadCompanyProfile().then((stored) => {
      setBusinessType(companyProfileFromPartial(stored).businessType);
    });
  }, []);

  const { suggested, more, context } = useMemo(
    () => partitionAiAssistantTools(businessType),
    [businessType],
  );

  useEffect(() => {
    void (async () => {
      const seen = await hasSeenAiAssistantOnboarding();
      if (!seen) setOnboardingOpen(true);
    })();
  }, []);

  const dismissOnboarding = useCallback(async () => {
    await markAiAssistantOnboardingSeen();
    setOnboardingOpen(false);
  }, []);

  return (
    <>
      <ScStickyScroll
        title="AI Assistant Tools"
        subtitle="Build a prompt, copy it, and paste into your ChatGPT app. Ideal Solutions does not bill for AI."
        backHref="/employee"
      >
        <Text style={scStyles.emptyText}>
          Each tool fills in a structured prompt for your own ChatGPT account. Works offline until you open ChatGPT.
        </Text>

        {!context.hasBusinessType ? (
          <Text style={scStyles.emptyText}>{tradeAiEmptyHint()}</Text>
        ) : null}

        {context.hasBusinessType && suggested.length > 0 ? (
          <>
            <Text style={scStyles.sectionLabel}>{suggestedForSectionTitle(context.tradeLabel)}</Text>
            {suggested.map((tool) => (
              <AiToolButton
                key={tool.id}
                title={tool.title}
                subtitle={tool.subtitle}
                onPress={() => router.push(tool.route as Href)}
              />
            ))}
          </>
        ) : null}

        {more.length > 0 ? (
          <>
            {context.hasBusinessType ? <Text style={scStyles.sectionLabel}>All tools</Text> : null}
            {more.map((tool) => (
              <AiToolButton
                key={tool.id}
                title={tool.title}
                subtitle={tool.subtitle}
                onPress={() => router.push(tool.route as Href)}
              />
            ))}
          </>
        ) : null}
      </ScStickyScroll>

      <Modal visible={onboardingOpen} transparent animationType="fade" onRequestClose={() => void dismissOnboarding()}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Use Your Own ChatGPT Account</Text>
            <Text style={styles.body}>
              Ideal Solutions Pro does not charge for AI usage. Employees use their own ChatGPT accounts for
              AI-generated assistance.
            </Text>
            <Pressable
              style={({ pressed }) => [scStyles.primaryCta, pressed && { opacity: 0.9 }, styles.primaryBtn]}
              onPress={() => void dismissOnboarding()}
            >
              <Text style={scStyles.primaryCtaText}>Continue</Text>
            </Pressable>
            <Link href={"/settings/employee-ai" as Href} asChild>
              <Pressable
                style={({ pressed }) => [scStyles.menuButton, pressed && { opacity: 0.9 }]}
                onPress={() => void dismissOnboarding()}
              >
                <Text style={scStyles.menuButtonText}>Learn More</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(colors: ColorScheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      borderRadius: 16,
      padding: 22,
      backgroundColor: hexToRgba(colors.accent, 0.28),
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.45),
      gap: 12,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
    },
    body: {
      color: colors.text,
      opacity: 0.85,
      fontSize: 15,
      lineHeight: 22,
    },
    primaryBtn: {
      marginTop: 8,
    },
  });
}
