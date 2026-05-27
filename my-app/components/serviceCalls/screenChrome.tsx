import { router, usePathname, type Href } from "expo-router";
import { useCallback, useMemo, type PropsWithChildren, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  FormScrollView,
  FORM_MULTILINE_EXTRA_SCROLL_HEIGHT,
  type FormScrollViewProps,
} from "@/components/FormScrollView";

import { getAccentTints, onAccentTextColor, secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useImmersiveChrome } from "@/context/ImmersiveChromeContext";
import { useImmersiveTextInputHandlers } from "@/hooks/useImmersiveTextInputHandlers";
import { injectImmersiveTextInputHandlers } from "@/lib/immersiveTextInputTree";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { isHomePath } from "@/lib/routePath";

export const HOME_FALLBACK_HREF = "/" as Href;
export const SETTINGS_FALLBACK_HREF = "/settings" as Href;

export function useScStyles() {
  const { colors } = useAppTheme();
  return useMemo(() => makeScStyles(colors), [colors]);
}

export function useGoBack(fallbackHref?: Href) {
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackHref) {
      router.replace(fallbackHref);
    }
  }, [fallbackHref]);
}

export function ScreenBackButton({
  fallbackHref,
  label = "← Back",
  onPress,
}: {
  fallbackHref?: Href;
  label?: string;
  onPress?: () => void;
}) {
  const scStyles = useScStyles();
  const goBack = useGoBack(fallbackHref);

  return (
    <Pressable
      onPress={onPress ?? goBack}
      style={({ pressed }) => [scStyles.backLink, pressed && scStyles.backPressed]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={scStyles.backLinkText}>{label}</Text>
    </Pressable>
  );
}

/** @deprecated Prefer ScreenBackButton — kept for existing imports; uses router.back() with href fallback. */
export function ServiceCallBackLink({
  href: fallbackHref = "/service-calls",
  label,
}: {
  href?: string | Href;
  label?: string;
}) {
  return <ScreenBackButton fallbackHref={fallbackHref as Href} label={label} />;
}

export function ServiceCallScreenHeader({
  title,
  subtitle,
  compact,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const scStyles = useScStyles();
  return (
    <View style={[scStyles.headerBlock, compact && scStyles.headerBlockCompact]}>
      <Text style={scStyles.title}>{title}</Text>
      {subtitle ? <Text style={scStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function StickyPageHeader({
  title,
  subtitle,
  showBack = true,
  fallbackHref,
  backHref,
  backLabel = "← Back",
  /** When true, title/subtitle stay visible while typing (default: collapse like AI Assistance). */
  keepTitleWhenImmersive = false,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  fallbackHref?: Href;
  backHref?: string | Href;
  backLabel?: string;
  keepTitleWhenImmersive?: boolean;
}) {
  const scStyles = useScStyles();
  const pathname = usePathname();
  const { immersiveActive } = useImmersiveChrome();
  const resolvedFallback = (backHref ?? fallbackHref) as Href | undefined;
  const collapsed = immersiveActive && !isHomePath(pathname) && !keepTitleWhenImmersive;

  return (
    <View style={scStyles.stickyHeader}>
      {showBack ? <ScreenBackButton fallbackHref={resolvedFallback} label={backLabel} /> : null}
      {collapsed ? null : <ServiceCallScreenHeader title={title} subtitle={subtitle} compact />}
    </View>
  );
}

/**
 * Standard page header for StickyScreenShell — collapses to back-only while typing on non-home screens.
 * New screens should use ScStickyScroll / StickyScrollScreen or this helper for the header slot.
 */
export function ImmersiveStickyPageHeader(
  props: Parameters<typeof StickyPageHeader>[0],
) {
  return <StickyPageHeader {...props} />;
}

type StickyScrollScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  showBack?: boolean;
  fallbackHref?: Href;
  /** Alias for `fallbackHref` when stack history may be empty. */
  backHref?: string | Href;
  backLabel?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<FormScrollViewProps, "children" | "contentContainerStyle" | "style">;
}>;

export function StickyScrollScreen({
  children,
  title,
  subtitle,
  showBack = true,
  fallbackHref,
  backHref,
  backLabel,
  contentContainerStyle,
  scrollStyle,
  scrollViewProps,
}: StickyScrollScreenProps) {
  const scStyles = useScStyles();
  const resolvedFallback = (backHref ?? fallbackHref) as Href | undefined;
  return (
    <View style={scStyles.screen}>
      <StickyPageHeader
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        fallbackHref={resolvedFallback}
        backLabel={backLabel}
      />
      <FormScrollView
        style={[scStyles.scrollBody, scrollStyle]}
        contentContainerStyle={[scStyles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={FORM_MULTILINE_EXTRA_SCROLL_HEIGHT}
        {...scrollViewProps}
      >
        {children}
      </FormScrollView>
    </View>
  );
}

export { FormScrollView } from "@/components/FormScrollView";

/**
 * ScrollView for StickyPageHeader layouts (non-form pages). Wires TextInputs for immersive headers.
 * Prefer ScStickyScroll / StickyScrollScreen for new form screens.
 */
export function ScreenScrollView({ children, ...rest }: ScrollViewProps) {
  const pathname = usePathname();
  const onHome = isHomePath(pathname);
  const immersiveHandlers = useImmersiveTextInputHandlers();
  const body = onHome ? children : injectImmersiveTextInputHandlers(children, immersiveHandlers);
  return <ScrollView {...rest}>{body}</ScrollView>;
}

/** Alias used across app screens — supports `backHref` for stack fallback when history is empty. */
export function ScStickyScroll({
  backHref,
  fallbackHref,
  ...rest
}: StickyScrollScreenProps & { backHref?: string | Href }) {
  return (
    <StickyScrollScreen
      fallbackHref={(backHref ?? fallbackHref) as Href | undefined}
      {...rest}
    />
  );
}

/** Sticky header row + arbitrary scroll body (e.g. KeyboardAvoidingView layouts). */
export function StickyScreenShell({
  header,
  children,
}: PropsWithChildren<{ header: ReactNode }>) {
  const scStyles = useScStyles();
  return (
    <View style={scStyles.screen}>
      {header}
      {children}
    </View>
  );
}

function makeScStyles(colors: ColorScheme) {
  const tints = getAccentTints(colors);
  const secondaryButtonBase = secondaryButtonStyle(colors, tints);

  return StyleSheet.create({
    screen: {
      flex: 1,
      minHeight: 0,
      backgroundColor: "transparent",
    },
    scrollBody: {
      flex: 1,
      minHeight: 0,
    },
    stickyHeader: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 4,
      backgroundColor: "transparent",
    },
    content: {
      padding: 20,
    },
    backLink: {
      alignSelf: "flex-start",
      marginBottom: 4,
      paddingVertical: 6,
    },
    backPressed: {
      opacity: 0.88,
    },
    backLinkText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
      opacity: 0.9,
    },
    headerBlock: {
      marginBottom: 20,
    },
    headerBlockCompact: {
      marginBottom: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: tints.mutedText,
    },
    menuButton: {
      ...secondaryButtonBase,
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderRadius: 14,
      marginBottom: 12,
    },
    menuButtonText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
    },
    menuButtonSecondary: {
      ...secondaryButtonBase,
      opacity: 0.95,
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderRadius: 14,
      marginBottom: 12,
    },
    menuButtonSecondaryText: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
      opacity: 0.75,
    },
    card: {
      ...secondaryButtonBase,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 4,
    },
    cardMeta: {
      color: tints.mutedText,
      fontSize: 14,
      lineHeight: 20,
    },
    emptyText: {
      color: tints.mutedText,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      ...secondaryButtonBase,
    },
    chipActive: {
      backgroundColor: tints.accentTintActive,
    },
    chipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
      opacity: 0.75,
    },
    chipTextActive: {
      color: colors.text,
      opacity: 1,
    },
    primaryCta: {
      backgroundColor: colors.accent,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 8,
      borderWidth: 0,
    },
    primaryCtaText: {
      color: onAccentTextColor(colors),
      fontSize: 17,
      fontWeight: "800",
    },
    completeFooter: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 0,
    },
    yesNoRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    yesNoBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      ...secondaryButtonBase,
    },
    yesNoBtnActive: {
      backgroundColor: colors.accent,
    },
    yesNoText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    yesNoTextActive: {
      color: onAccentTextColor(colors),
    },
    sectionLabel: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginTop: 8,
    },
    detailLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 14,
      marginBottom: 4,
      opacity: 0.65,
    },
    detailValue: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
    summaryCard: {
      marginTop: 16,
      padding: 14,
      borderRadius: 14,
      ...secondaryButtonBase,
    },
    summaryLine: {
      fontSize: 15,
      color: tints.mutedText,
      marginTop: 4,
    },
    summaryTotal: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.text,
      marginTop: 8,
    },
    actionRow: {
      marginTop: 12,
      gap: 10,
    },
  });
}
