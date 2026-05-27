import { cacheDirectory, documentDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { Alert, Linking, Platform, Share } from "react-native";
import type { View } from "react-native";

import { buildInAppBusinessCardUrl } from "@/lib/businessCardPublicLink";
import { deferAfterInteractions } from "@/lib/deferNavigation";
import { virtualCardExportHtml } from "@/lib/virtualBusinessCard/htmlExport";
import { safeTrim, sanitizeVirtualBusinessCardData } from "@/lib/virtualBusinessCard/safeCard";
import type { VirtualBusinessCardData } from "@/lib/virtualBusinessCard/types";
import { buildVCardFromVirtualCard } from "@/lib/virtualBusinessCard/vcard";

function shareUrlForCard(): string {
  return buildInAppBusinessCardUrl({ forQrScan: true });
}

/** Public link included in SMS and share text for this device's active card. */
export function buildCardShareLink(): string {
  return shareUrlForCard();
}

function exportErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "Something went wrong while exporting your card. Try again.";
}

async function runExport(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    Alert.alert("Export failed", exportErrorMessage(error));
  }
}

export function virtualCardShareMessage(card: VirtualBusinessCardData): string {
  const safe = sanitizeVirtualBusinessCardData(card);
  const lines = [
    safeTrim(safe.businessName),
    safeTrim(safe.userName),
    safeTrim(safe.jobTitle),
    safeTrim(safe.phone) ? `Phone: ${safeTrim(safe.phone)}` : "",
    safeTrim(safe.email) ? `Email: ${safeTrim(safe.email)}` : "",
    safeTrim(safe.website) ? `Web: ${safeTrim(safe.website)}` : "",
    safeTrim(safe.address) ? `Address: ${safeTrim(safe.address)}` : "",
    "",
    `View my business card: ${shareUrlForCard()}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildVirtualCardSmsUrl(
  card: VirtualBusinessCardData,
  recipientPhone?: string,
): string {
  const body = encodeURIComponent(virtualCardShareMessage(sanitizeVirtualBusinessCardData(card)));
  const digits = (recipientPhone ?? "").replace(/[^\d+]/g, "");
  return digits ? `sms:${digits}?body=${body}` : `sms:?body=${body}`;
}

export async function openVirtualCardSms(
  card: VirtualBusinessCardData,
  recipientPhone?: string,
): Promise<boolean> {
  const safe = sanitizeVirtualBusinessCardData(card);
  const message = virtualCardShareMessage(safe);
  const sms = buildVirtualCardSmsUrl(safe, recipientPhone);
  if (Platform.OS !== "web" && (await Linking.canOpenURL(sms))) {
    await Linking.openURL(sms);
    return true;
  }
  await Share.share({
    message,
    title: safeTrim(safe.businessName) || "Business card",
  });
  return false;
}

export async function shareVirtualCardAsText(card: VirtualBusinessCardData): Promise<void> {
  await runExport(async () => {
    const safe = sanitizeVirtualBusinessCardData(card);
    await Share.share({
      message: virtualCardShareMessage(safe),
      title: safeTrim(safe.businessName) || "Business card",
    });
  });
}

export async function shareVirtualCardAsLink(card: VirtualBusinessCardData): Promise<void> {
  await runExport(async () => {
    const safe = sanitizeVirtualBusinessCardData(card);
    const url = shareUrlForCard();
    await Share.share({
      message: `${safeTrim(safe.businessName) || "My business card"}\n${url}`,
      url,
      title: "Share business card link",
    });
  });
}

export async function shareVirtualCardAsVCard(card: VirtualBusinessCardData): Promise<void> {
  await runExport(async () => {
    const safe = sanitizeVirtualBusinessCardData(card);
    const vcard = buildVCardFromVirtualCard(safe);
    const base = cacheDirectory ?? documentDirectory;
    if (!base) {
      Alert.alert("Export failed", "File storage is not available on this device.");
      return;
    }
    const path = `${base}business-card-${safe.id}.vcf`;
    await writeAsStringAsync(path, vcard, { encoding: "utf8" });
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Contact card ready", "Sharing is not available. The vCard was saved to cache.");
      return;
    }
    await Sharing.shareAsync(path, { mimeType: "text/vcard", dialogTitle: "Share contact card" });
  });
}

export async function shareVirtualCardAsPdf(card: VirtualBusinessCardData): Promise<void> {
  await runExport(async () => {
    const safe = sanitizeVirtualBusinessCardData(card);
    const html = virtualCardExportHtml(safe, shareUrlForCard());
    const { uri } = await Print.printToFileAsync({ html });
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("PDF ready", `Saved to ${uri}`);
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share business card PDF" });
  });
}

export async function shareVirtualCardAsImage(
  card: VirtualBusinessCardData,
  viewRef: RefObject<View | null>,
): Promise<void> {
  await runExport(async () => {
    if (!viewRef.current) {
      Alert.alert("Preview not ready", "Wait for the card preview to load, then try again.");
      return;
    }
    const { captureRef } = await import("react-native-view-shot");
    const uri = await captureRef(viewRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Image ready", `Saved to ${uri}`);
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share business card image" });
  });
}

export async function showVirtualCardShareMenu(
  card: VirtualBusinessCardData,
  viewRef: RefObject<View | null>,
): Promise<void> {
  const safe = sanitizeVirtualBusinessCardData(card);
  deferAfterInteractions(() => {
    Alert.alert("Share my business card", "Choose how to share", [
      { text: "Cancel", style: "cancel" },
      { text: "Text / email", onPress: () => void shareVirtualCardAsText(safe) },
      { text: "Share link", onPress: () => void shareVirtualCardAsLink(safe) },
      { text: "Image (PNG)", onPress: () => void shareVirtualCardAsImage(safe, viewRef) },
      { text: "PDF", onPress: () => void shareVirtualCardAsPdf(safe) },
      { text: "Contact (vCard)", onPress: () => void shareVirtualCardAsVCard(safe) },
    ]);
  });
}
