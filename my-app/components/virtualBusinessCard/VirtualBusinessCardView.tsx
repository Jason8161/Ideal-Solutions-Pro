import { Image } from "expo-image";
import { forwardRef, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View, type ImageStyle, type ViewStyle } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { buildInAppBusinessCardUrl } from "@/lib/businessCardPublicLink";
import { getVirtualCardTemplate } from "@/lib/virtualBusinessCard/templates";
import type { VirtualBusinessCardData } from "@/lib/virtualBusinessCard/types";
import { safeTrim, sanitizeVirtualBusinessCardData } from "@/lib/virtualBusinessCard/safeCard";
import { hexToRgba } from "@/lib/colorSchemeStorage";

type Props = {
  card: VirtualBusinessCardData;
  compact?: boolean;
};

function CardImage({
  uri,
  style,
  contentFit,
  accessibilityLabel,
}: {
  uri: string;
  style: ImageStyle;
  contentFit: "contain" | "cover";
  accessibilityLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      accessibilityLabel={accessibilityLabel}
      onError={() => setFailed(true)}
    />
  );
}

function fontFamilyForStyle(fontStyle: VirtualBusinessCardData["fontStyle"]): string | undefined {
  if (fontStyle === "classic") {
    return Platform.select({ ios: "Georgia", android: "serif" });
  }
  return undefined;
}

function ContactLines({
  card,
  styles,
  emphasizeSocial,
}: {
  card: VirtualBusinessCardData;
  styles: ReturnType<typeof makeStyles>;
  emphasizeSocial?: boolean;
}) {
  const lines: { label: string; value: string }[] = [];
  if (safeTrim(card.phone)) lines.push({ label: "Phone", value: safeTrim(card.phone) });
  if (safeTrim(card.email)) lines.push({ label: "Email", value: safeTrim(card.email) });
  if (safeTrim(card.website)) lines.push({ label: "Web", value: safeTrim(card.website) });
  if (safeTrim(card.address)) lines.push({ label: "Area", value: safeTrim(card.address) });
  if (safeTrim(card.licenseNumber)) lines.push({ label: "License", value: safeTrim(card.licenseNumber) });

  return (
    <View style={styles.contactBlock}>
      {lines.map((line) => (
        <Text key={line.label} style={styles.contactLine} numberOfLines={2}>
          <Text style={styles.contactLabel}>{line.label}: </Text>
          {line.value}
        </Text>
      ))}
      {emphasizeSocial && Array.isArray(card.socialLinks) && card.socialLinks.length > 0 ? (
        <View style={styles.socialBlock}>
          {card.socialLinks.map((link) => (
            <Text key={link.id} style={styles.socialLine} numberOfLines={1}>
              {safeTrim(link.label)}: {safeTrim(link.url).replace(/^https?:\/\//i, "")}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export const VirtualBusinessCardView = forwardRef<View, Props>(function VirtualBusinessCardView(
  { card, compact },
  ref,
) {
  const safeCard = useMemo(() => sanitizeVirtualBusinessCardData(card), [card]);
  const template = getVirtualCardTemplate(safeCard.templateId);
  const styles = useMemo(() => makeStyles(safeCard, compact), [safeCard, compact]);
  const qrUrl = buildInAppBusinessCardUrl({ forQrScan: true });
  const qrSize = compact ? 56 : template.layout === "qr-hero" ? 96 : 64;
  const showQr = safeCard.showQrCode && safeTrim(qrUrl).length > 0;

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.mediaRow}>
        {safeCard.logoUri ? (
          <CardImage uri={safeCard.logoUri} style={styles.logo} contentFit="contain" accessibilityLabel="Logo" />
        ) : null}
        {safeCard.profilePhotoUri ? (
          <CardImage
            uri={safeCard.profilePhotoUri}
            style={styles.profilePhoto}
            contentFit="cover"
            accessibilityLabel="Profile"
          />
        ) : null}
      </View>
      <View style={styles.titleBlock}>
        {safeTrim(safeCard.businessName) ? (
          <Text style={styles.businessName} numberOfLines={2}>
            {safeCard.businessName}
          </Text>
        ) : null}
        {safeTrim(safeCard.userName) ? (
          <Text style={styles.userName} numberOfLines={1}>
            {safeCard.userName}
          </Text>
        ) : null}
        {safeTrim(safeCard.jobTitle) ? (
          <Text style={styles.jobTitle} numberOfLines={1}>
            {safeCard.jobTitle}
          </Text>
        ) : null}
        {safeTrim(safeCard.tagline) ? (
          <Text style={styles.tagline} numberOfLines={2}>
            {safeCard.tagline}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const qr = showQr ? (
    <View style={styles.qrWrap}>
      <QRCode value={qrUrl} size={qrSize} color="#0f172a" backgroundColor="#ffffff" />
    </View>
  ) : null;

  const layout = template.layout;

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {layout === "qr-hero" ? (
        <View style={styles.qrHeroLayout}>
          {header}
          <View style={styles.qrHeroCenter}>{qr}</View>
          <ContactLines card={safeCard} styles={styles} />
        </View>
      ) : layout === "centered" ? (
        <View style={styles.centeredLayout}>
          {header}
          <ContactLines card={safeCard} styles={styles} />
          {qr ? <View style={styles.qrBottom}>{qr}</View> : null}
        </View>
      ) : layout === "split" ? (
        <View style={styles.splitLayout}>
          <View style={styles.splitLeft}>
            {header}
            <ContactLines card={safeCard} styles={styles} />
          </View>
          {qr ? <View style={styles.splitRight}>{qr}</View> : null}
        </View>
      ) : layout === "minimal-pro" ? (
        <View style={styles.minimalLayout}>
          {header}
          <ContactLines card={safeCard} styles={styles} />
          {qr ? <View style={styles.qrCorner}>{qr}</View> : null}
        </View>
      ) : (
        <View style={styles.standardLayout}>
          <View style={styles.accentStripe} />
          <View style={styles.standardBody}>
            {header}
            <ContactLines card={safeCard} styles={styles} emphasizeSocial={safeCard.templateId === "social-friendly"} />
            {qr ? <View style={styles.qrBottom}>{qr}</View> : null}
          </View>
        </View>
      )}
      <Text style={styles.templateBadge} numberOfLines={1}>
        {template.name}
      </Text>
    </View>
  );
});

function makeStyles(card: VirtualBusinessCardData, compact?: boolean) {
  const accent = card.accentColor;
  const fontFamily = fontFamilyForStyle(card.fontStyle);
  const letterSpacing = card.fontStyle === "condensed" ? 0.3 : 0;
  const pad = compact ? 12 : 18;

  return StyleSheet.create({
    card: {
      backgroundColor: card.backgroundColor,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: hexToRgba(accent, 0.65),
      overflow: "hidden",
      minHeight: compact ? 160 : 220,
      padding: pad,
      paddingBottom: pad + 14,
    } as ViewStyle,
    standardLayout: { flexDirection: "row", flex: 1, gap: 10 },
    accentStripe: {
      width: 6,
      borderRadius: 4,
      backgroundColor: accent,
    },
    standardBody: { flex: 1, gap: 8 },
    centeredLayout: { alignItems: "center", gap: 10 },
    splitLayout: { flexDirection: "row", gap: 12, alignItems: "center" },
    splitLeft: { flex: 1, gap: 8 },
    splitRight: { alignItems: "center", justifyContent: "center" },
    minimalLayout: { gap: 10 },
    qrHeroLayout: { gap: 10, alignItems: "center" },
    qrHeroCenter: { marginVertical: 6 },
    headerBlock: { gap: 8 },
    mediaRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    logo: { width: compact ? 40 : 52, height: compact ? 40 : 52, borderRadius: 8 },
    profilePhoto: {
      width: compact ? 44 : 56,
      height: compact ? 44 : 56,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: accent,
    },
    titleBlock: { gap: 2 },
    businessName: {
      color: card.textColor,
      fontSize: compact ? 17 : 20,
      fontWeight: "800",
      fontFamily,
      letterSpacing,
    },
    userName: {
      color: card.textColor,
      fontSize: compact ? 14 : 16,
      fontWeight: "700",
      opacity: 0.95,
      fontFamily,
      letterSpacing,
    },
    jobTitle: {
      color: hexToRgba(card.textColor, 0.85),
      fontSize: compact ? 12 : 13,
      fontWeight: "600",
      fontFamily,
    },
    tagline: {
      color: hexToRgba(card.textColor, 0.75),
      fontSize: 11,
      fontStyle: "italic",
      marginTop: 4,
      fontFamily,
    },
    contactBlock: { gap: 3, marginTop: 4 },
    contactLine: {
      color: card.textColor,
      fontSize: compact ? 11 : 12,
      lineHeight: compact ? 15 : 17,
      fontFamily,
      letterSpacing,
    },
    contactLabel: { fontWeight: "700", color: accent },
    socialBlock: { marginTop: 6, gap: 2 },
    socialLine: {
      color: hexToRgba(card.textColor, 0.9),
      fontSize: 10,
      fontWeight: "600",
    },
    qrWrap: {
      padding: 6,
      backgroundColor: "#ffffff",
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    qrBottom: { marginTop: 8, alignSelf: "flex-start" },
    qrCorner: { position: "absolute", right: pad, bottom: pad + 16 },
    templateBadge: {
      position: "absolute",
      right: 8,
      bottom: 4,
      fontSize: 9,
      color: hexToRgba(card.textColor, 0.45),
      fontWeight: "600",
    },
  });
}
