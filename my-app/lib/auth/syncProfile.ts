import { refreshHomeProfile } from "@/lib/homeBoot";
import {
  companyProfileFromPartial,
  loadCompanyProfile,
  saveCompanyProfile,
  type CompanyProfile,
} from "@/lib/profileStorage";

import { defaultUserProfile, saveUserProfile } from "./userProfileStorage";
import type { UserProfile } from "./types";

/** Maps account profile fields onto the existing company profile store. */
export async function syncUserProfileToCompanyProfile(profile: UserProfile): Promise<CompanyProfile> {
  const stored = await loadCompanyProfile();
  const existing = companyProfileFromPartial(stored);

  const next: CompanyProfile = {
    ...existing,
    companyName: profile.companyName.trim() || existing.companyName,
    ownerName: profile.fullName.trim() || existing.ownerName,
    supportEmail: profile.email.trim() || existing.supportEmail,
    subscriptionTier: profile.subscriptionTier,
  };

  await saveCompanyProfile(next);
  await saveUserProfile(profile);
  await refreshHomeProfile();
  return next;
}

export async function hydrateUserProfileFromCompany(userId: string, email: string): Promise<UserProfile> {
  const stored = await loadCompanyProfile();
  const company = companyProfileFromPartial(stored);
  return defaultUserProfile({
    userId,
    email,
    fullName: company.ownerName,
    companyName: company.companyName,
    subscriptionTier: company.subscriptionTier,
    selectedTrialPlan: company.subscriptionTier,
  });
}
