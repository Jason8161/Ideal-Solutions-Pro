export const VIRTUAL_CARD_SCHEMA_VERSION = 1 as const;

export type VirtualCardTemplateId =
  | "clean-modern"
  | "contractor-bold"
  | "electric-blue-glow"
  | "luxury-black-gold"
  | "simple-white"
  | "rugged-work-truck"
  | "minimal-pro"
  | "service-call"
  | "social-friendly"
  | "qr-focused";

export type VirtualCardFontStyle = "modern" | "classic" | "condensed";

export type VirtualCardSocialLink = {
  id: string;
  label: string;
  url: string;
};

export type VirtualBusinessCardData = {
  schemaVersion: typeof VIRTUAL_CARD_SCHEMA_VERSION;
  id: string;
  /** User-facing label in the card list (e.g. "Main card"). */
  name: string;
  templateId: VirtualCardTemplateId;
  businessName: string;
  userName: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  licenseNumber: string;
  tagline: string;
  logoUri: string | null;
  profilePhotoUri: string | null;
  socialLinks: VirtualCardSocialLink[];
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontStyle: VirtualCardFontStyle;
  showQrCode: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VirtualBusinessCardStore = {
  schemaVersion: typeof VIRTUAL_CARD_SCHEMA_VERSION;
  activeCardId: string | null;
  cards: VirtualBusinessCardData[];
  /** Reserved for future cloud sync (user id, last synced at, etc.). */
  cloud?: {
    enabled: boolean;
    lastSyncedAt: string | null;
  };
};
