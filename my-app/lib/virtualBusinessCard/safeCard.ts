import { normalizeHex } from "@/lib/colorSchemeStorage";

import { getVirtualCardTemplate } from "@/lib/virtualBusinessCard/templates";
import type { VirtualBusinessCardData, VirtualCardSocialLink } from "@/lib/virtualBusinessCard/types";

export function safeTrim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Accepts common RN / Expo image URI schemes; rejects empty or malformed values. */
export function isUsableImageUri(uri: unknown): uri is string {
  if (typeof uri !== "string") return false;
  const trimmed = uri.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/|file:\/\/|content:\/\/|data:|ph:\/\/|assets-library:\/\/)/i.test(trimmed);
}

export function sanitizeVirtualBusinessCardData(card: VirtualBusinessCardData): VirtualBusinessCardData {
  const template = getVirtualCardTemplate(card.templateId);
  const socialLinks: VirtualCardSocialLink[] = Array.isArray(card.socialLinks)
    ? card.socialLinks
        .filter((link): link is VirtualCardSocialLink => typeof link === "object" && link !== null)
        .map((link) => ({
          id: typeof link.id === "string" ? link.id : `soc_${Date.now()}`,
          label: safeTrim(link.label),
          url: safeTrim(link.url),
        }))
    : [];

  return {
    ...card,
    name: safeTrim(card.name) || "My business card",
    businessName: safeTrim(card.businessName),
    userName: safeTrim(card.userName),
    jobTitle: safeTrim(card.jobTitle),
    phone: safeTrim(card.phone),
    email: safeTrim(card.email),
    website: safeTrim(card.website),
    address: safeTrim(card.address),
    licenseNumber: safeTrim(card.licenseNumber),
    tagline: safeTrim(card.tagline),
    logoUri: isUsableImageUri(card.logoUri) ? card.logoUri.trim() : null,
    profilePhotoUri: isUsableImageUri(card.profilePhotoUri) ? card.profilePhotoUri.trim() : null,
    socialLinks,
    accentColor: normalizeHex(card.accentColor) ?? template.accentColor,
    backgroundColor: normalizeHex(card.backgroundColor) ?? template.backgroundColor,
    textColor: normalizeHex(card.textColor) ?? template.textColor,
    showQrCode: card.showQrCode !== false,
  };
}
