import * as Linking from "expo-linking";
import { Link, type Href } from "expo-router";
import { useMemo } from "react";
import { Platform, StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { PUBLIC_LEGAL_URLS } from "@/lib/legal/publicLegalUrls";
import { useResponsiveTypography } from "@/lib/layout/responsiveTypography";
import type { PackageDisclosureInfo } from "@/lib/revenuecat/disclosure";
import type { SubscriptionPlan } from "@/lib/subscriptionPlans";

const PRIVACY_HREF = "/settings/legal/privacy" as Href;
const TERMS_HREF = "/settings/legal/terms" as Href;
const EULA_HREF = "/settings/legal/eula" as Href;

type SubscriptionPurchaseDisclosureProps = {
  plan: SubscriptionPlan;
  /** Live StoreKit / RevenueCat package details when available. */
  rcPackageInfo?: PackageDisclosureInfo | null;
};

function LegalLink({
  label,
  href,
  externalUrl,
  styles,
}: {
  label: string;
  href: Href;
  externalUrl: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Link
      href={href}
      onLongPress={() => void Linking.openURL(externalUrl)}
      accessibilityHint={`Online copy: ${externalUrl}`}
    >
      <Text style={styles.legalLink}>{label}</Text>
    </Link>
  );
}

export function SubscriptionPurchaseDisclosure({
  plan,
  rcPackageInfo,
}: SubscriptionPurchaseDisclosureProps) {
  const { colors } = useAppTheme();
  const typo = useResponsiveTypography();
  const styles = useMemo(() => makeStyles(colors, typo), [colors, typo.isTablet]);

  if (!plan.isPaid) return null;

  const price = rcPackageInfo?.priceLabel?.trim() ? rcPackageInfo.priceLabel : plan.priceLabel;
  const length = rcPackageInfo?.lengthLabel?.trim() ? rcPackageInfo.lengthLabel : "1 month (monthly)";
  const freeTrialLabel = rcPackageInfo?.freeTrialLabel ?? null;

  const paymentAccountLabel = Platform.OS === "ios" ? "Apple ID" : "Google Play";

  return (
  <>
    <Text style={styles.disclosure} accessibilityRole="text">
      <Text style={styles.disclosureStrong}>{plan.name}</Text>
      {" — auto-renewing subscription\n"}
      Length: {length}
      {"\n"}
      Price after any trial: {price}
      {freeTrialLabel ? `\nFree trial: ${freeTrialLabel}` : ""}
      {"\n"}
      {Platform.OS === "ios"
        ? "Payment is charged to your Apple ID account at confirmation. Subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in App Store account settings."
        : `Payment is charged to your ${paymentAccountLabel} account at confirmation. Subscription renews automatically unless cancelled at least 24 hours before the end of the current period.`}
    </Text>
    <Text style={styles.legalNote}>
      By subscribing you agree to our{" "}
      <LegalLink label="Terms of Use" href={TERMS_HREF} externalUrl={PUBLIC_LEGAL_URLS.terms} styles={styles} />
      {", "}
      <LegalLink label="EULA" href={EULA_HREF} externalUrl={PUBLIC_LEGAL_URLS.eula} styles={styles} />
      {", and "}
      <LegalLink
        label="Privacy Policy"
        href={PRIVACY_HREF}
        externalUrl={PUBLIC_LEGAL_URLS.privacy}
        styles={styles}
      />
      .
    </Text>
    {Platform.OS === "ios" ? (
      <Text style={styles.legalNote}>
        Online copies:{" "}
        <Text style={styles.legalLink} onPress={() => void Linking.openURL(PUBLIC_LEGAL_URLS.eula)}>
          EULA
        </Text>
        {" · "}
        <Text style={styles.legalLink} onPress={() => void Linking.openURL(PUBLIC_LEGAL_URLS.privacy)}>
          Privacy Policy
        </Text>
      </Text>
    ) : null}
  </>
  );
}

function makeStyles(colors: ColorScheme, typo: ReturnType<typeof useResponsiveTypography>) {
  return StyleSheet.create({
    disclosure: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.scaleLineHeight(21),
      color: colors.text,
      opacity: 0.95,
    },
    disclosureStrong: {
      fontWeight: "800",
      color: colors.text,
    },
    legalNote: {
      fontSize: typo.hintFontSize,
      lineHeight: typo.scaleLineHeight(21),
      color: colors.text,
      opacity: 0.92,
      textAlign: "center",
    },
    legalLink: {
      fontWeight: "700",
      textDecorationLine: "underline",
      color: colors.accent,
    },
  });
}
