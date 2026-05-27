import AsyncStorage from "@react-native-async-storage/async-storage";

import { companyProfileFromPartial, loadCompanyProfile } from "@/lib/profileStorage";

import { DEFAULT_INVOICE_CUSTOMIZATION, type InvoiceCustomization } from "./types";

const STORAGE_KEY = "ideal_solutions_invoice_customization_v1";

function normalize(raw: Partial<InvoiceCustomization> | null): InvoiceCustomization {
  const base = { ...DEFAULT_INVOICE_CUSTOMIZATION };
  if (!raw) return base;
  return {
    companyName: typeof raw.companyName === "string" ? raw.companyName : base.companyName,
    logoUri: raw.logoUri === null || typeof raw.logoUri === "string" ? raw.logoUri : base.logoUri,
    phone: typeof raw.phone === "string" ? raw.phone : base.phone,
    email: typeof raw.email === "string" ? raw.email : base.email,
    address: typeof raw.address === "string" ? raw.address : base.address,
    licenseNumber: typeof raw.licenseNumber === "string" ? raw.licenseNumber : base.licenseNumber,
    accentColor: typeof raw.accentColor === "string" ? raw.accentColor : base.accentColor,
    fontFamily: raw.fontFamily === "bebas" ? "bebas" : "system",
    defaultPaymentTerms:
      typeof raw.defaultPaymentTerms === "string" ? raw.defaultPaymentTerms : base.defaultPaymentTerms,
    defaultNotes: typeof raw.defaultNotes === "string" ? raw.defaultNotes : base.defaultNotes,
    footerText: typeof raw.footerText === "string" ? raw.footerText : base.footerText,
    showLogo: raw.showLogo !== false,
    showLicense: raw.showLicense !== false,
    showTaxLine: raw.showTaxLine !== false,
    defaultTaxPercent:
      typeof raw.defaultTaxPercent === "string" ? raw.defaultTaxPercent : base.defaultTaxPercent,
    numberingPrefix: typeof raw.numberingPrefix === "string" ? raw.numberingPrefix : base.numberingPrefix,
  };
}

export async function loadInvoiceCustomization(): Promise<InvoiceCustomization> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeProfileDefaults(DEFAULT_INVOICE_CUSTOMIZATION);
    return mergeProfileDefaults(normalize(JSON.parse(raw) as Partial<InvoiceCustomization>));
  } catch {
    return mergeProfileDefaults(DEFAULT_INVOICE_CUSTOMIZATION);
  }
}

async function mergeProfileDefaults(custom: InvoiceCustomization): Promise<InvoiceCustomization> {
  const stored = await loadCompanyProfile();
  const profile = companyProfileFromPartial(stored);
  const address =
    custom.address.trim() ||
    profile.companyAddress.trim() ||
    [profile.companyStreet, profile.companyCity, profile.companyState, profile.companyZip]
      .filter(Boolean)
      .join(", ");
  return {
    ...custom,
    companyName: custom.companyName.trim() || profile.companyName,
    logoUri: custom.logoUri ?? profile.logoUri,
    phone: custom.phone.trim() || profile.phoneNumber || profile.mobilePhone,
    email: custom.email.trim() || profile.supportEmail,
    address,
    licenseNumber: custom.licenseNumber.trim() || profile.licenseNumber || profile.tradeLicense,
  };
}

export async function saveInvoiceCustomization(custom: InvoiceCustomization): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(custom)));
}
