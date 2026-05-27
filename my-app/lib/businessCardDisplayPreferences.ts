import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  companyProfileFromPartial,
  loadCompanyProfile,
  saveCompanyProfile,
  type CompanyProfile,
} from "@/lib/profileStorage";

const STORAGE_KEY = "ideal_solutions_business_card_display_v1";

export type BusinessCardFieldKey =
  | "companyName"
  | "ownerName"
  | "jobTitle"
  | "businessType"
  | "phone"
  | "mobile"
  | "fax"
  | "email"
  | "website"
  | "address"
  | "licenseNumber"
  | "tradeLicense"
  | "licensedInsuredBadge"
  | "logo"
  | "facebook"
  | "tagline"
  | "yearsInBusiness";

export type BusinessCardAudience = "inApp" | "publicQr";

export type BusinessCardVisibility = Record<BusinessCardFieldKey, boolean>;

export type BusinessCardDisplayPrefs = {
  inApp: BusinessCardVisibility;
  publicQr: BusinessCardVisibility;
};

export const BUSINESS_CARD_FIELD_KEYS: readonly BusinessCardFieldKey[] = [
  "companyName",
  "ownerName",
  "jobTitle",
  "businessType",
  "phone",
  "mobile",
  "fax",
  "email",
  "website",
  "address",
  "licenseNumber",
  "tradeLicense",
  "licensedInsuredBadge",
  "logo",
  "facebook",
  "tagline",
  "yearsInBusiness",
] as const;

export type BusinessCardFieldMeta = {
  key: BusinessCardFieldKey;
  label: string;
  description: string;
  /** Hide toggle when profile has no value for this field (badge is always available). */
  requiresProfileValue?: boolean;
};

export const BUSINESS_CARD_FIELD_META: readonly BusinessCardFieldMeta[] = [
  {
    key: "logo",
    label: "Logo",
    description: "Company logo from User info or Logos.",
  },
  {
    key: "companyName",
    label: "Company name",
    description: "Your business name at the top of the card.",
  },
  {
    key: "ownerName",
    label: "Contact name",
    description: "Owner or primary contact name (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "jobTitle",
    label: "Job title / role",
    description: "Your role or title (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "businessType",
    label: "Type of business",
    description: "Trade or business category from User info.",
    requiresProfileValue: true,
  },
  {
    key: "tagline",
    label: "Tagline",
    description: "Short slogan or motto (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "phone",
    label: "Phone",
    description: "Main support line from User info. Tappable for call, text, or service request.",
  },
  {
    key: "mobile",
    label: "Mobile",
    description: "Separate mobile number (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "fax",
    label: "Fax",
    description: "Fax number (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "email",
    label: "Email",
    description: "Support email from User info.",
  },
  {
    key: "website",
    label: "Website",
    description: "Company website URL (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "address",
    label: "Address",
    description: "Street, city, state, and ZIP from User info.",
  },
  {
    key: "licenseNumber",
    label: "License number",
    description: "State or contractor license (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "tradeLicense",
    label: "Trade license",
    description: "Additional trade or specialty license (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "yearsInBusiness",
    label: "Years in business",
    description: "How long you have been operating (optional in profile).",
    requiresProfileValue: true,
  },
  {
    key: "licensedInsuredBadge",
    label: "Licensed & insured badge",
    description: "Shows a badge when enabled (no extra text required in profile).",
  },
  {
    key: "facebook",
    label: "Facebook page",
    description: "Link to your Facebook business page when a URL is saved in profile.",
    requiresProfileValue: true,
  },
];

function defaultVisibility(overrides?: Partial<BusinessCardVisibility>): BusinessCardVisibility {
  const base: BusinessCardVisibility = {
    companyName: true,
    ownerName: false,
    jobTitle: true,
    businessType: true,
    phone: true,
    mobile: false,
    fax: false,
    email: true,
    website: true,
    address: true,
    licenseNumber: false,
    tradeLicense: false,
    licensedInsuredBadge: false,
    logo: true,
    facebook: false,
    tagline: false,
    yearsInBusiness: false,
  };
  return { ...base, ...overrides };
}

export function defaultBusinessCardDisplayPrefs(): BusinessCardDisplayPrefs {
  return {
    inApp: defaultVisibility(),
    publicQr: defaultVisibility({
      ownerName: false,
      mobile: false,
      fax: false,
      tagline: false,
      tradeLicense: false,
      yearsInBusiness: false,
      licensedInsuredBadge: true,
    }),
  };
}

function normalizeVisibility(raw: unknown, fallback: BusinessCardVisibility): BusinessCardVisibility {
  if (typeof raw !== "object" || raw === null) return { ...fallback };
  const out = { ...fallback };
  for (const key of BUSINESS_CARD_FIELD_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "boolean") out[key] = v;
  }
  return out;
}

function normalizePrefs(raw: unknown): BusinessCardDisplayPrefs {
  const defaults = defaultBusinessCardDisplayPrefs();
  if (typeof raw !== "object" || raw === null) return defaults;
  const obj = raw as Partial<BusinessCardDisplayPrefs>;
  return {
    inApp: normalizeVisibility(obj.inApp, defaults.inApp),
    publicQr: normalizeVisibility(obj.publicQr, defaults.publicQr),
  };
}

export function isFieldEnabled(
  prefs: BusinessCardDisplayPrefs,
  audience: BusinessCardAudience,
  key: BusinessCardFieldKey,
): boolean {
  return prefs[audience][key];
}

export async function loadBusinessCardDisplayPrefs(): Promise<BusinessCardDisplayPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return normalizePrefs(JSON.parse(raw));
  } catch {
    // fall through to profile
  }

  const profile = await loadCompanyProfile();
  if (profile?.businessCardDisplay) {
    return normalizePrefs(profile.businessCardDisplay);
  }

  return defaultBusinessCardDisplayPrefs();
}

export async function saveBusinessCardDisplayPrefs(prefs: BusinessCardDisplayPrefs): Promise<void> {
  const normalized = normalizePrefs(prefs);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

  const stored = await loadCompanyProfile();
  const merged = companyProfileFromPartial(stored);
  await saveCompanyProfile({
    ...merged,
    businessCardDisplay: normalized,
  });
}

export function profileHasFieldValue(profile: CompanyProfile, key: BusinessCardFieldKey): boolean {
  switch (key) {
    case "companyName":
      return profile.companyName.trim().length > 0;
    case "ownerName":
      return profile.ownerName.trim().length > 0;
    case "jobTitle":
      return profile.jobTitle.trim().length > 0;
    case "businessType":
      return profile.businessType.trim().length > 0;
    case "phone":
      return profile.phoneNumber.trim().length > 0;
    case "mobile":
      return profile.mobilePhone.trim().length > 0;
    case "fax":
      return profile.fax.trim().length > 0;
    case "email":
      return profile.supportEmail.trim().length > 0;
    case "website":
      return profile.website.trim().length > 0;
    case "address": {
      const line = [
        profile.companyStreet,
        profile.companyCity,
        profile.companyState,
        profile.companyZip,
      ]
        .map((s) => s.trim())
        .filter(Boolean);
      return line.length > 0 || profile.companyAddress.trim().length > 0;
    }
    case "licenseNumber":
      return profile.licenseNumber.trim().length > 0;
    case "tradeLicense":
      return profile.tradeLicense.trim().length > 0;
    case "yearsInBusiness":
      return profile.yearsInBusiness.trim().length > 0;
    case "tagline":
      return profile.tagline.trim().length > 0;
    case "facebook":
      return profile.facebookPageUrl.trim().length > 0;
    case "logo":
      return Boolean(profile.logoUri?.trim());
    case "licensedInsuredBadge":
      return true;
    default:
      return false;
  }
}

export function fieldToggleVisible(meta: BusinessCardFieldMeta, profile: CompanyProfile): boolean {
  if (meta.key === "licensedInsuredBadge") return true;
  if (!meta.requiresProfileValue) return true;
  return profileHasFieldValue(profile, meta.key);
}
