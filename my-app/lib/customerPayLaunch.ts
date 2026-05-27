import { Alert, Linking } from "react-native";

import type { CustomerPaymentMethod } from "@/lib/invoices/customerPaymentMethodsStorage";
import type { PaymentAppPresetId } from "@/lib/paymentAppsPreferences";

async function openFirstAvailable(urls: readonly string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      const ok = await Linking.canOpenURL(url).catch(() => false);
      if (ok) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

async function openNativeOrWeb(nativeCandidates: readonly string[], webUrl: string): Promise<void> {
  const opened = await openFirstAvailable(nativeCandidates);
  if (!opened) {
    await Linking.openURL(webUrl);
  }
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function appendInvoiceQuery(baseUrl: string, invoiceRef?: string, amount?: string): string {
  if (!invoiceRef && !amount) return baseUrl;
  try {
    const url = new URL(normalizeUrl(baseUrl));
    if (invoiceRef) url.searchParams.set("invoice", invoiceRef);
    if (amount) url.searchParams.set("amount", amount);
    return url.toString();
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const parts: string[] = [];
    if (invoiceRef) parts.push(`invoice=${encodeURIComponent(invoiceRef)}`);
    if (amount) parts.push(`amount=${encodeURIComponent(amount)}`);
    return `${baseUrl}${sep}${parts.join("&")}`;
  }
}

const LAUNCH_BY_PRESET: Record<
  Exclude<PaymentAppPresetId, "custom">,
  { native: readonly string[]; web: string }
> = {
  venmo: { native: ["venmo://", "venmo://paycharge"], web: "https://venmo.com/" },
  square: { native: ["square://", "square-commerce://"], web: "https://squareup.com/us/en/point-of-sale" },
  cashapp: { native: ["cashapp://", "squarecash://"], web: "https://cash.app/" },
  paypal: { native: ["paypal://", "com.paypal.android.p2pmobile://"], web: "https://www.paypal.com/" },
  zelle: { native: ["zelle://"], web: "https://www.zellepay.com/" },
  stripe: { native: ["stripe://"], web: "https://dashboard.stripe.com/" },
  "apple-pay": { native: ["shoebox://", "wallet://"], web: "https://www.apple.com/apple-pay/" },
};

/**
 * Opens a customer payment method — saved pay URL first, then native app / web fallback.
 */
export async function openCustomerPaymentMethod(
  method: CustomerPaymentMethod,
  context?: { invoiceRef?: string; amount?: string },
): Promise<void> {
  const label = method.name.trim() || "Payment";
  const savedUrl = method.payUrl?.trim();

  if (savedUrl) {
    const url = appendInvoiceQuery(savedUrl, context?.invoiceRef, context?.amount);
    try {
      await Linking.openURL(normalizeUrl(url));
      return;
    } catch {
      Alert.alert(`Could not open ${label}`, "Check the payment link in Settings.");
      return;
    }
  }

  if (method.preset === "custom") {
    Alert.alert("No link saved", `Add a payment URL for ${label} under Settings → Payment methods.`);
    return;
  }

  const { native, web } = LAUNCH_BY_PRESET[method.preset];
  try {
    await openNativeOrWeb(native, web);
  } catch {
    Alert.alert(`Could not open ${label}`, "Install the app or try again from your browser.");
  }
}
