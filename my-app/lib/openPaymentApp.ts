import { Alert, Linking } from "react-native";

import {
  loadPaymentAppsPreferences,
  type PaymentApp,
  type PaymentAppPresetId,
} from "@/lib/paymentAppsPreferences";

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

type LaunchConfig = {
  native: readonly string[];
  web: string;
};

const LAUNCH_BY_PRESET: Record<Exclude<PaymentAppPresetId, "custom">, LaunchConfig> = {
  venmo: {
    native: ["venmo://", "venmo://paycharge"],
    web: "https://venmo.com/",
  },
  square: {
    native: ["square://", "square-commerce://"],
    web: "https://squareup.com/us/en/point-of-sale",
  },
  cashapp: {
    native: ["cashapp://", "squarecash://"],
    web: "https://cash.app/",
  },
  paypal: {
    native: ["paypal://", "com.paypal.android.p2pmobile://"],
    web: "https://www.paypal.com/",
  },
  zelle: {
    native: ["zelle://"],
    web: "https://www.zellepay.com/",
  },
  stripe: {
    native: ["stripe://"],
    web: "https://dashboard.stripe.com/",
  },
  "apple-pay": {
    native: ["shoebox://", "wallet://"],
    web: "https://www.apple.com/apple-pay/",
  },
};

function normalizeCustomUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

async function openCustomPaymentApp(app: PaymentApp): Promise<void> {
  const raw = app.customUrl?.trim();
  if (!raw) {
    Alert.alert("No link saved", `Add a URL for ${app.name} under Settings → Payment methods.`);
    return;
  }
  const url = normalizeCustomUrl(raw);
  try {
    const ok = await Linking.canOpenURL(url).catch(() => true);
    if (!ok) {
      Alert.alert("Could not open link", "Check the URL in Payment methods settings.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Could not open link", "Check the URL or try opening it from your browser.");
  }
}

async function openPresetPaymentApp(preset: Exclude<PaymentAppPresetId, "custom">): Promise<void> {
  const { native, web } = LAUNCH_BY_PRESET[preset];
  try {
    await openNativeOrWeb(native, web);
  } catch {
    Alert.alert("Could not open app", "Install the app or try again from your browser.");
  }
}

/**
 * Opens a configured payment app: native deep link when installed, otherwise the official web URL.
 */
export async function openPaymentApp(appId: string): Promise<void> {
  const apps = await loadPaymentAppsPreferences();
  const app = apps.find((a) => a.id === appId);
  if (!app) {
    Alert.alert("Not found", "This payment method is no longer in your list.");
    return;
  }
  if (!app.enabled) {
    Alert.alert("Turned off", `Enable ${app.name} under Settings → Payment methods first.`);
    return;
  }
  if (app.preset === "custom") {
    await openCustomPaymentApp(app);
    return;
  }
  await openPresetPaymentApp(app.preset);
}
