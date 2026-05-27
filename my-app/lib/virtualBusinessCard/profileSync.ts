import { companyAddressLine } from "@/lib/businessCardContent";
import { companyProfileFromPartial, loadCompanyProfile, type CompanyProfile } from "@/lib/profileStorage";
import { createVirtualBusinessCard, newVirtualCardSocialId } from "@/lib/virtualBusinessCard/storage";
import { isUsableImageUri } from "@/lib/virtualBusinessCard/safeCard";
import type { VirtualBusinessCardData } from "@/lib/virtualBusinessCard/types";

function socialFromProfile(profile: CompanyProfile): VirtualBusinessCardData["socialLinks"] {
  const links: VirtualBusinessCardData["socialLinks"] = [];
  const fb = profile.facebookPageUrl.trim();
  if (fb) {
    links.push({
      id: newVirtualCardSocialId(),
      label: "Facebook",
      url: fb.match(/^https?:\/\//i) ? fb : `https://${fb}`,
    });
  }
  return links;
}

/** Build card fields from User info / company profile. */
export function virtualCardFromCompanyProfile(
  profile: CompanyProfile,
  overrides?: Partial<Pick<VirtualBusinessCardData, "id" | "name" | "templateId">>,
): VirtualBusinessCardData {
  const base = createVirtualBusinessCard({
    name: overrides?.name ?? "My business card",
    templateId: overrides?.templateId,
  });
  const address = companyAddressLine(profile);

  return {
    ...base,
    id: overrides?.id ?? base.id,
    businessName: profile.companyName.trim() || base.businessName,
    userName: profile.ownerName.trim() || base.userName,
    jobTitle: profile.jobTitle.trim() || profile.businessType.trim() || base.jobTitle,
    phone: profile.phoneNumber.trim() || profile.mobilePhone.trim() || base.phone,
    email: profile.supportEmail.trim() || base.email,
    website: profile.website.trim() || base.website,
    address: address || base.address,
    licenseNumber: profile.licenseNumber.trim() || profile.tradeLicense.trim() || base.licenseNumber,
    tagline: profile.tagline.trim() || base.tagline,
    logoUri: isUsableImageUri(profile.logoUri) ? profile.logoUri.trim() : base.logoUri,
    socialLinks: socialFromProfile(profile),
    updatedAt: new Date().toISOString(),
  };
}

export async function loadVirtualCardFromUserProfile(): Promise<VirtualBusinessCardData> {
  const stored = await loadCompanyProfile();
  return virtualCardFromCompanyProfile(companyProfileFromPartial(stored));
}
