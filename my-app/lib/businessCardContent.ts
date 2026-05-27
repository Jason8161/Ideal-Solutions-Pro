import type { CompanyProfile } from "@/lib/profileStorage";
import { composeFullAddress } from "@/lib/profileStorage";
import type { BusinessCardAudience, BusinessCardDisplayPrefs, BusinessCardFieldKey } from "@/lib/businessCardDisplayPreferences";
import { isFieldEnabled, profileHasFieldValue } from "@/lib/businessCardDisplayPreferences";

export type BusinessCardRow = {
  key: BusinessCardFieldKey;
  label: string;
  value: string;
  /** Phone row supports call/text actions in the card screen. */
  kind?: "phone" | "email" | "link";
  href?: string;
};

export function companyAddressLine(profile: CompanyProfile): string {
  const line = composeFullAddress(
    profile.companyStreet,
    profile.companyCity,
    profile.companyState,
    profile.companyZip,
  );
  if (line.trim()) return line;
  return profile.companyAddress.trim();
}

export function buildBusinessCardRows(
  profile: CompanyProfile,
  prefs: BusinessCardDisplayPrefs,
  audience: BusinessCardAudience,
): BusinessCardRow[] {
  const rows: BusinessCardRow[] = [];
  const show = (key: BusinessCardFieldKey) =>
    isFieldEnabled(prefs, audience, key) && profileHasFieldValue(profile, key);

  if (show("ownerName")) {
    rows.push({ key: "ownerName", label: "Name", value: profile.ownerName.trim() });
  }
  if (show("jobTitle")) {
    rows.push({ key: "jobTitle", label: "Role", value: profile.jobTitle.trim() });
  }
  if (show("tagline")) {
    rows.push({ key: "tagline", label: "Tagline", value: profile.tagline.trim() });
  }

  const address = companyAddressLine(profile);
  if (show("address") && address) {
    rows.push({ key: "address", label: "Address", value: address });
  }
  if (show("phone")) {
    rows.push({
      key: "phone",
      label: "Phone",
      value: profile.phoneNumber.trim(),
      kind: "phone",
    });
  }
  if (show("mobile")) {
    rows.push({
      key: "mobile",
      label: "Mobile",
      value: profile.mobilePhone.trim(),
      kind: "phone",
    });
  }
  if (show("fax")) {
    rows.push({ key: "fax", label: "Fax", value: profile.fax.trim() });
  }
  if (show("email")) {
    const email = profile.supportEmail.trim();
    rows.push({
      key: "email",
      label: "Email",
      value: email,
      kind: "email",
      href: `mailto:${email}`,
    });
  }
  if (show("website")) {
    const url = profile.website.trim();
    const href = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    rows.push({
      key: "website",
      label: "Website",
      value: url,
      kind: "link",
      href,
    });
  }
  if (show("licenseNumber")) {
    rows.push({ key: "licenseNumber", label: "License", value: profile.licenseNumber.trim() });
  }
  if (show("tradeLicense")) {
    rows.push({ key: "tradeLicense", label: "Trade license", value: profile.tradeLicense.trim() });
  }
  if (show("yearsInBusiness")) {
    rows.push({
      key: "yearsInBusiness",
      label: "Years in business",
      value: profile.yearsInBusiness.trim(),
    });
  }
  if (show("facebook")) {
    const url = profile.facebookPageUrl.trim();
    rows.push({
      key: "facebook",
      label: "Facebook",
      value: url,
      kind: "link",
      href: url.match(/^https?:\/\//i) ? url : `https://${url}`,
    });
  }

  return rows;
}

export function showBusinessCardHeader(
  profile: CompanyProfile,
  prefs: BusinessCardDisplayPrefs,
  audience: BusinessCardAudience,
): {
  showLogo: boolean;
  showCompanyName: boolean;
  showBusinessType: boolean;
  showLicensedBadge: boolean;
} {
  return {
    showLogo: isFieldEnabled(prefs, audience, "logo") && profileHasFieldValue(profile, "logo"),
    showCompanyName:
      isFieldEnabled(prefs, audience, "companyName") && profileHasFieldValue(profile, "companyName"),
    showBusinessType:
      isFieldEnabled(prefs, audience, "businessType") && profileHasFieldValue(profile, "businessType"),
    showLicensedBadge: isFieldEnabled(prefs, audience, "licensedInsuredBadge"),
  };
}

export function businessCardHasVisibleContent(
  profile: CompanyProfile,
  prefs: BusinessCardDisplayPrefs,
  audience: BusinessCardAudience,
): boolean {
  const header = showBusinessCardHeader(profile, prefs, audience);
  if (header.showLogo || header.showCompanyName || header.showBusinessType || header.showLicensedBadge) {
    return true;
  }
  return buildBusinessCardRows(profile, prefs, audience).length > 0;
}
