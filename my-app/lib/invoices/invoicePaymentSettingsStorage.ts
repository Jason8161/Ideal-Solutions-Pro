import AsyncStorage from "@react-native-async-storage/async-storage";

export const INVOICE_PAYMENT_SETTINGS_STORAGE_KEY = "ideal_invoice_payment_settings_v1";

export type InvoicePaymentProvider =
  | "stripe"
  | "square"
  | "tap_to_pay"
  | "paypal"
  | "venmo"
  | "cashapp"
  | "custom";

export type InvoicePaymentSettings = {
  /** When true, SMS/email invoice messages include a pay-online link when configured. */
  enabled: boolean;
  provider: InvoicePaymentProvider;
  /** Payment link base URL from your provider dashboard (Stripe Payment Link, Square, etc.). */
  paymentLinkBaseUrl: string;
};

export const INVOICE_PAYMENT_PROVIDER_LABELS: Record<InvoicePaymentProvider, string> = {
  stripe: "Stripe Payment Link",
  square: "Square",
  tap_to_pay: "Tap to Pay",
  paypal: "PayPal",
  venmo: "Venmo business link",
  cashapp: "Cash App",
  custom: "Custom URL",
};

/** Card acceptance options shown first with quick-select in invoice payment settings. */
export const INVOICE_PAYMENT_SUGGESTED_PROVIDERS = ["stripe", "square", "tap_to_pay"] as const satisfies readonly InvoicePaymentProvider[];

export const INVOICE_PAYMENT_PROVIDERS_ORDER: readonly InvoicePaymentProvider[] = [
  ...INVOICE_PAYMENT_SUGGESTED_PROVIDERS,
  "paypal",
  "venmo",
  "cashapp",
  "custom",
];

export function isSuggestedInvoicePaymentProvider(provider: InvoicePaymentProvider): boolean {
  return (INVOICE_PAYMENT_SUGGESTED_PROVIDERS as readonly InvoicePaymentProvider[]).includes(provider);
}

/** Remote pay-online links; Tap to Pay is in-person NFC only. */
export function isRemoteInvoicePaymentProvider(provider: InvoicePaymentProvider): boolean {
  return provider !== "tap_to_pay";
}

export const INVOICE_PAYMENT_PROVIDER_HINTS: Record<InvoicePaymentProvider, string> = {
  stripe:
    "Paste your Stripe Payment Link URL from the Stripe Dashboard. Ideal Solutions Pro appends invoice reference query params.",
  square:
    "Paste a Square payment or invoice link. Create per-invoice links in Square if needed; we append reference params when possible.",
  tap_to_pay:
    "Accept cards in person with Stripe Tap to Pay or Square Tap to Pay on your phone (NFC). Invoice pay links below are for remote payment when you text or email invoices.",
  paypal:
    "Paste a PayPal.me link or PayPal invoice/payment link base URL.",
  venmo:
    "Paste your Venmo business profile or payment request link (https://venmo.com/…).",
  cashapp:
    "Paste your Cash App $Cashtag pay link (https://cash.app/$…).",
  custom: "Any HTTPS payment page. Ideal Solutions Pro appends ?invoice=…&amount=… for reference.",
};

export const DEFAULT_INVOICE_PAYMENT_SETTINGS: InvoicePaymentSettings = {
  enabled: false,
  provider: "stripe",
  paymentLinkBaseUrl: "",
};

function normalize(raw: Partial<InvoicePaymentSettings> | null): InvoicePaymentSettings {
  const base = { ...DEFAULT_INVOICE_PAYMENT_SETTINGS };
  if (!raw) return base;
  const provider = raw.provider;
  const validProvider =
    provider === "stripe" ||
    provider === "square" ||
    provider === "tap_to_pay" ||
    provider === "paypal" ||
    provider === "venmo" ||
    provider === "cashapp" ||
    provider === "custom"
      ? provider
      : base.provider;
  return {
    enabled: raw.enabled === true,
    provider: validProvider,
    paymentLinkBaseUrl:
      typeof raw.paymentLinkBaseUrl === "string" ? raw.paymentLinkBaseUrl.trim() : base.paymentLinkBaseUrl,
  };
}

export async function loadInvoicePaymentSettings(): Promise<InvoicePaymentSettings> {
  try {
    const raw = await AsyncStorage.getItem(INVOICE_PAYMENT_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INVOICE_PAYMENT_SETTINGS };
    return normalize(JSON.parse(raw) as Partial<InvoicePaymentSettings>);
  } catch {
    return { ...DEFAULT_INVOICE_PAYMENT_SETTINGS };
  }
}

export async function saveInvoicePaymentSettings(settings: InvoicePaymentSettings): Promise<void> {
  await AsyncStorage.setItem(INVOICE_PAYMENT_SETTINGS_STORAGE_KEY, JSON.stringify(normalize(settings)));
}

export function isInvoicePaymentLinkConfigured(settings: InvoicePaymentSettings): boolean {
  if (!isRemoteInvoicePaymentProvider(settings.provider)) {
    return true;
  }
  return settings.paymentLinkBaseUrl.trim().length > 0;
}
