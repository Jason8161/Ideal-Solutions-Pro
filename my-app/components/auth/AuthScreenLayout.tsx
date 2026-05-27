import { Image } from "expo-image";
import { Link, type Href } from "expo-router";
import { useMemo, type PropsWithChildren, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import { StickyPageHeader } from "@/components/serviceCalls/screenChrome";
import { getAccentTints } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { DEFAULT_COMPANY_LOGO_SOURCE } from "@/lib/companyLogoAsset";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

type AuthScreenLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  footer?: ReactNode;
}>;

export function AuthScreenLayout({ title, subtitle, footer, children }: AuthScreenLayoutProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <AppConstructionBackdrop />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoWrap}>
              <Image
                source={DEFAULT_COMPANY_LOGO_SOURCE}
                style={styles.logo}
                contentFit="contain"
                accessibilityLabel="Ideal Solutions Pro logo"
              />
              <Text style={styles.brand}>Ideal Solutions Pro</Text>
              <Text style={styles.tagline}>Built for contractors — from DIY to pro crews</Text>
            </View>

            <StickyPageHeader title={title} subtitle={subtitle} showBack={false} keepTitleWhenImmersive />

            <View style={styles.form}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function AuthLinkRow({
  prompt,
  href,
  linkLabel,
}: {
  prompt: string;
  href: Href;
  linkLabel: string;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeLinkStyles(colors), [colors]);

  return (
    <Text style={styles.row}>
      {prompt}{" "}
      <Link href={href} style={styles.link}>
        {linkLabel}
      </Link>
    </Text>
  );
}

function makeStyles(colors: ColorScheme) {
  const { mutedText } = getAccentTints(colors);
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    safe: {
      flex: 1,
      backgroundColor: "transparent",
    },
    flex: {
      flex: 1,
    },
    scroll: {
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    logoWrap: {
      alignItems: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    logo: {
      width: 88,
      height: 88,
      marginBottom: 10,
    },
    brand: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    tagline: {
      color: mutedText,
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 4,
      paddingHorizontal: 12,
    },
    form: {
      gap: 14,
      marginTop: 8,
    },
    footer: {
      marginTop: 20,
      alignItems: "center",
    },
  });
}

function makeLinkStyles(colors: ColorScheme) {
  return StyleSheet.create({
    row: {
      color: colors.text,
      opacity: 0.85,
      fontSize: 15,
      textAlign: "center",
    },
    link: {
      color: colors.accent,
      fontWeight: "700",
    },
  });
}
