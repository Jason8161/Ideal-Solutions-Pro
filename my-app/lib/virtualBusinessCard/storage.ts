import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeHex } from "@/lib/colorSchemeStorage";
import { getVirtualCardTemplate } from "@/lib/virtualBusinessCard/templates";
import { isUsableImageUri } from "@/lib/virtualBusinessCard/safeCard";
import {
  VIRTUAL_CARD_SCHEMA_VERSION,
  type VirtualBusinessCardData,
  type VirtualBusinessCardStore,
  type VirtualCardFontStyle,
  type VirtualCardSocialLink,
  type VirtualCardTemplateId,
} from "@/lib/virtualBusinessCard/types";

const STORAGE_KEY = "ideal_solutions_virtual_business_cards_v1";

const TEMPLATE_IDS: VirtualCardTemplateId[] = [
  "clean-modern",
  "contractor-bold",
  "electric-blue-glow",
  "luxury-black-gold",
  "simple-white",
  "rugged-work-truck",
  "minimal-pro",
  "service-call",
  "social-friendly",
  "qr-focused",
];

export function newVirtualBusinessCardId(): string {
  return `vbc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newVirtualCardSocialId(): string {
  return `soc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createVirtualBusinessCard(options?: {
  name?: string;
  templateId?: VirtualCardTemplateId;
}): VirtualBusinessCardData {
  const now = new Date().toISOString();
  const templateId = options?.templateId ?? "clean-modern";
  const theme = getVirtualCardTemplate(templateId);
  return {
    schemaVersion: VIRTUAL_CARD_SCHEMA_VERSION,
    id: newVirtualBusinessCardId(),
    name: options?.name ?? "My business card",
    templateId,
    businessName: "",
    userName: "",
    jobTitle: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    licenseNumber: "",
    tagline: "",
    logoUri: null,
    profilePhotoUri: null,
    socialLinks: [],
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    fontStyle: "modern",
    showQrCode: true,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeSocialLink(raw: unknown): VirtualCardSocialLink | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Partial<VirtualCardSocialLink>;
  if (typeof row.id !== "string" || typeof row.label !== "string" || typeof row.url !== "string") {
    return null;
  }
  return { id: row.id, label: row.label.trim(), url: row.url.trim() };
}

function normalizeCard(raw: unknown): VirtualBusinessCardData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Partial<VirtualBusinessCardData>;
  if (typeof row.id !== "string") return null;
  const templateId = row.templateId as VirtualCardTemplateId;
  const theme = getVirtualCardTemplate(TEMPLATE_IDS.includes(templateId) ? templateId : "clean-modern");
  const fontStyle: VirtualCardFontStyle =
    row.fontStyle === "classic" || row.fontStyle === "condensed" || row.fontStyle === "modern"
      ? row.fontStyle
      : "modern";

  const socialLinks = Array.isArray(row.socialLinks)
    ? row.socialLinks.map(normalizeSocialLink).filter((l): l is VirtualCardSocialLink => l !== null)
    : [];

  const createdAt = typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString();
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : createdAt;

  return {
    schemaVersion: VIRTUAL_CARD_SCHEMA_VERSION,
    id: row.id,
    name: typeof row.name === "string" ? row.name.trim() || "Business card" : "Business card",
    templateId: theme.id,
    businessName: typeof row.businessName === "string" ? row.businessName : "",
    userName: typeof row.userName === "string" ? row.userName : "",
    jobTitle: typeof row.jobTitle === "string" ? row.jobTitle : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    email: typeof row.email === "string" ? row.email : "",
    website: typeof row.website === "string" ? row.website : "",
    address: typeof row.address === "string" ? row.address : "",
    licenseNumber: typeof row.licenseNumber === "string" ? row.licenseNumber : "",
    tagline: typeof row.tagline === "string" ? row.tagline : "",
    logoUri: isUsableImageUri(row.logoUri) ? row.logoUri.trim() : null,
    profilePhotoUri: isUsableImageUri(row.profilePhotoUri) ? row.profilePhotoUri.trim() : null,
    socialLinks,
    accentColor: normalizeHex(typeof row.accentColor === "string" ? row.accentColor : "") ?? theme.accentColor,
    backgroundColor:
      normalizeHex(typeof row.backgroundColor === "string" ? row.backgroundColor : "") ?? theme.backgroundColor,
    textColor: normalizeHex(typeof row.textColor === "string" ? row.textColor : "") ?? theme.textColor,
    fontStyle,
    showQrCode: row.showQrCode !== false,
    createdAt,
    updatedAt,
  };
}

function normalizeStore(raw: unknown): VirtualBusinessCardStore {
  const empty: VirtualBusinessCardStore = {
    schemaVersion: VIRTUAL_CARD_SCHEMA_VERSION,
    activeCardId: null,
    cards: [],
    cloud: { enabled: false, lastSyncedAt: null },
  };
  if (typeof raw !== "object" || raw === null) return empty;
  const row = raw as Partial<VirtualBusinessCardStore>;
  const cards = Array.isArray(row.cards)
    ? row.cards.map(normalizeCard).filter((c): c is VirtualBusinessCardData => c !== null)
    : [];
  const activeCardId =
    typeof row.activeCardId === "string" && cards.some((c) => c.id === row.activeCardId)
      ? row.activeCardId
      : cards[0]?.id ?? null;
  return {
    schemaVersion: VIRTUAL_CARD_SCHEMA_VERSION,
    activeCardId,
    cards,
    cloud:
      typeof row.cloud === "object" && row.cloud !== null
        ? {
            enabled: (row.cloud as { enabled?: boolean }).enabled === true,
            lastSyncedAt:
              typeof (row.cloud as { lastSyncedAt?: string }).lastSyncedAt === "string"
                ? (row.cloud as { lastSyncedAt: string }).lastSyncedAt
                : null,
          }
        : { enabled: false, lastSyncedAt: null },
  };
}

export async function loadVirtualBusinessCardStore(): Promise<VirtualBusinessCardStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeStore(null);
    return normalizeStore(JSON.parse(raw));
  } catch {
    return normalizeStore(null);
  }
}

export async function saveVirtualBusinessCardStore(store: VirtualBusinessCardStore): Promise<void> {
  const normalized = normalizeStore(store);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export async function upsertVirtualBusinessCard(card: VirtualBusinessCardData): Promise<VirtualBusinessCardStore> {
  const store = await loadVirtualBusinessCardStore();
  const updated = { ...card, updatedAt: new Date().toISOString() };
  const idx = store.cards.findIndex((c) => c.id === updated.id);
  const cards = idx >= 0 ? [...store.cards] : [updated, ...store.cards];
  if (idx >= 0) cards[idx] = updated;
  const next: VirtualBusinessCardStore = {
    ...store,
    cards,
    activeCardId: store.activeCardId ?? updated.id,
  };
  await saveVirtualBusinessCardStore(next);
  return next;
}

export async function setActiveVirtualBusinessCardId(cardId: string): Promise<VirtualBusinessCardStore> {
  const store = await loadVirtualBusinessCardStore();
  if (!store.cards.some((c) => c.id === cardId)) return store;
  const next = { ...store, activeCardId: cardId };
  await saveVirtualBusinessCardStore(next);
  return next;
}

export async function deleteVirtualBusinessCard(cardId: string): Promise<VirtualBusinessCardStore> {
  const store = await loadVirtualBusinessCardStore();
  const cards = store.cards.filter((c) => c.id !== cardId);
  let activeCardId = store.activeCardId;
  if (activeCardId === cardId) activeCardId = cards[0]?.id ?? null;
  const next = { ...store, cards, activeCardId };
  await saveVirtualBusinessCardStore(next);
  return next;
}

export function duplicateVirtualBusinessCard(card: VirtualBusinessCardData): VirtualBusinessCardData {
  const now = new Date().toISOString();
  return {
    ...card,
    schemaVersion: VIRTUAL_CARD_SCHEMA_VERSION,
    id: newVirtualBusinessCardId(),
    name: `${card.name.trim() || "Business card"} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
}
