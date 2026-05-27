import AsyncStorage from "@react-native-async-storage/async-storage";

import { deleteCompanyLogoFile, persistCompanyLogoUri } from "@/lib/companyLogoStorage";
import {
  normalizeSubscriptionTierId,
  type SubscriptionTierId,
} from "@/lib/subscriptionPlans";

const PROFILE_STORAGE_KEY = "ideal_solutions_company_profile_v1";

export type CompanyProfile = {
  businessType: string;
  companyName: string;
  companyStreet: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  /** Single-line summary (derived from street / city / state / zip). */
  companyAddress: string;
  shippingSame: boolean;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingAddress: string;
  /** Geocoded from shipping address on save (search origin for supply houses). */
  shippingLatitude?: number | null;
  shippingLongitude?: number | null;
  phoneNumber: string;
  supportEmail: string;
  logoUri: string | null;
  profileCompleted: boolean;
  /** First-launch plan picker completed (see PlanPickerScreen). */
  planPickerCompleted: boolean;
  /** Selected or inferred tier for feature gating (RevenueCat may override paid tiers). */
  subscriptionTier: SubscriptionTierId;
  /** Optional card-only fields (edit under User info when available). */
  ownerName: string;
  jobTitle: string;
  website: string;
  mobilePhone: string;
  fax: string;
  tagline: string;
  licenseNumber: string;
  tradeLicense: string;
  yearsInBusiness: string;
  licensedAndInsured: boolean;
  facebookPageUrl: string;
  /** Synced from Settings → Business card display (see businessCardDisplayPreferences). */
  businessCardDisplay?: unknown;
  /** Synced from Settings → Payment methods (see paymentAppsPreferences). */
  paymentApps?: unknown;
};

/** Build one line for labels, PDFs, or older code paths. */
export function composeFullAddress(street: string, city: string, state: string, zip: string): string {
  const parts: string[] = [];
  const s = street.trim();
  if (s) parts.push(s);
  const cityState = [city.trim(), state.trim()].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  const z = zip.trim();
  if (z) parts.push(z);
  return parts.join(", ");
}

export async function loadCompanyProfile(): Promise<Partial<CompanyProfile> | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<CompanyProfile>;
  } catch {
    return null;
  }
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not write profile to device storage.";
    throw new Error(message);
  }
}

/** Fill missing fields when merging partial stored data. */
export function companyProfileFromPartial(stored: Partial<CompanyProfile> | null): CompanyProfile {
  return {
    businessType: stored?.businessType ?? "",
    companyName: stored?.companyName ?? "",
    companyStreet: stored?.companyStreet ?? "",
    companyCity: stored?.companyCity ?? "",
    companyState: stored?.companyState ?? "",
    companyZip: stored?.companyZip ?? "",
    companyAddress: stored?.companyAddress ?? "",
    shippingSame: stored?.shippingSame ?? true,
    shippingStreet: stored?.shippingStreet ?? "",
    shippingCity: stored?.shippingCity ?? "",
    shippingState: stored?.shippingState ?? "",
    shippingZip: stored?.shippingZip ?? "",
    shippingAddress: stored?.shippingAddress ?? "",
    shippingLatitude: stored?.shippingLatitude ?? null,
    shippingLongitude: stored?.shippingLongitude ?? null,
    phoneNumber: stored?.phoneNumber ?? "",
    supportEmail: stored?.supportEmail ?? "",
    logoUri: stored?.logoUri ?? null,
    profileCompleted: stored?.profileCompleted ?? false,
    planPickerCompleted: stored?.planPickerCompleted ?? false,
    subscriptionTier: normalizeSubscriptionTierId(stored?.subscriptionTier),
    ownerName: stored?.ownerName ?? "",
    jobTitle: stored?.jobTitle ?? "",
    website: stored?.website ?? "",
    mobilePhone: stored?.mobilePhone ?? "",
    fax: stored?.fax ?? "",
    tagline: stored?.tagline ?? "",
    licenseNumber: stored?.licenseNumber ?? "",
    tradeLicense: stored?.tradeLicense ?? "",
    yearsInBusiness: stored?.yearsInBusiness ?? "",
    licensedAndInsured: stored?.licensedAndInsured ?? false,
    facebookPageUrl: stored?.facebookPageUrl ?? "",
    businessCardDisplay: stored?.businessCardDisplay,
    paymentApps: stored?.paymentApps,
  };
}

/** Saves company logo to device storage; returns the persisted file URI (or null when removed). */
export async function updateCompanyLogo(logoUri: string | null): Promise<string | null> {
  const stored = await loadCompanyProfile();
  const profile = companyProfileFromPartial(stored);
  const previousUri = profile.logoUri;

  let nextUri: string | null = null;
  if (logoUri?.trim()) {
    nextUri = await persistCompanyLogoUri(logoUri.trim());
    if (!nextUri) {
      throw new Error("Could not save the logo on this device.");
    }
  }

  if (previousUri && previousUri !== nextUri) {
    await deleteCompanyLogoFile(previousUri);
  }

  await saveCompanyProfile({ ...profile, logoUri: nextUri });
  return nextUri;
}

export async function savePlanPickerChoice(tier: SubscriptionTierId): Promise<CompanyProfile> {
  const stored = await loadCompanyProfile();
  const profile = companyProfileFromPartial(stored);
  const next: CompanyProfile = {
    ...profile,
    subscriptionTier: tier,
    planPickerCompleted: true,
  };
  await saveCompanyProfile(next);
  return next;
}

/** Updates cached profile tier without changing plan-picker completion (RevenueCat / dev sync). */
export async function updateProfileSubscriptionTier(tier: SubscriptionTierId): Promise<CompanyProfile> {
  const normalized = normalizeSubscriptionTierId(tier);
  const stored = await loadCompanyProfile();
  const profile = companyProfileFromPartial(stored);
  if (profile.subscriptionTier === normalized) {
    return profile;
  }
  const next: CompanyProfile = { ...profile, subscriptionTier: normalized };
  await saveCompanyProfile(next);
  return next;
}
