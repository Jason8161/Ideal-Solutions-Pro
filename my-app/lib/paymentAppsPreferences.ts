import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  companyProfileFromPartial,
  loadCompanyProfile,
  saveCompanyProfile,
} from "@/lib/profileStorage";

const STORAGE_KEY = "ideal_solutions_payment_apps_v1";

export type PaymentAppPresetId =
  | "venmo"
  | "square"
  | "cashapp"
  | "paypal"
  | "zelle"
  | "stripe"
  | "apple-pay"
  | "custom";

export type PaymentApp = {
  id: string;
  name: string;
  enabled: boolean;
  customUrl?: string;
  preset: PaymentAppPresetId;
};

export type PaymentAppPresetDefinition = {
  preset: Exclude<PaymentAppPresetId, "custom">;
  name: string;
  description: string;
  /** Prominent quick-select for credit-card accepting apps. */
  suggested?: boolean;
};

/** Credit-card processors recommended for contractors. */
export const PAYMENT_APP_SUGGESTED_PRESETS = ["stripe", "square"] as const satisfies readonly Exclude<
  PaymentAppPresetId,
  "custom"
>[];

export const PAYMENT_APP_PRESET_DEFINITIONS: readonly PaymentAppPresetDefinition[] = [
  {
    preset: "stripe",
    name: "Stripe",
    description: "Accept credit and debit cards — Payment Links and Dashboard on mobile.",
    suggested: true,
  },
  {
    preset: "square",
    name: "Square",
    description: "Accept cards in person or online — Point of Sale and invoicing.",
    suggested: true,
  },
  {
    preset: "venmo",
    name: "Venmo",
    description: "Peer-to-peer payments many customers already use.",
  },
  {
    preset: "cashapp",
    name: "Cash App",
    description: "Cash App for Business or personal $Cashtag payments.",
  },
  {
    preset: "paypal",
    name: "PayPal",
    description: "PayPal checkout, invoices, and payment links.",
  },
  {
    preset: "zelle",
    name: "Zelle",
    description: "Bank-to-bank transfers through the Zelle network.",
  },
  {
    preset: "apple-pay",
    name: "Apple Pay",
    description: "Tap to pay and Wallet (optional; opens Apple Pay info).",
  },
] as const;

function presetAppId(preset: Exclude<PaymentAppPresetId, "custom">): string {
  return preset;
}

export function defaultPaymentAppsPreferences(): PaymentApp[] {
  const defaultEnabled = new Set<PaymentAppPresetId>(["venmo", "square", "cashapp", "paypal"]);
  return PAYMENT_APP_PRESET_DEFINITIONS.map((def) => ({
    id: presetAppId(def.preset),
    name: def.name,
    enabled: defaultEnabled.has(def.preset),
    preset: def.preset,
  }));
}

function isPresetId(value: unknown): value is Exclude<PaymentAppPresetId, "custom"> {
  return (
    typeof value === "string" &&
    PAYMENT_APP_PRESET_DEFINITIONS.some((d) => d.preset === value)
  );
}

function normalizeApp(raw: unknown, fallback?: PaymentApp): PaymentApp | null {
  if (typeof raw !== "object" || raw === null) return fallback ?? null;
  const obj = raw as Partial<PaymentApp>;
  const preset =
    obj.preset === "custom"
      ? "custom"
      : isPresetId(obj.preset)
        ? obj.preset
        : fallback?.preset ?? "custom";
  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : fallback?.id;
  if (!id) return null;
  const name =
    typeof obj.name === "string" && obj.name.trim()
      ? obj.name.trim()
      : (fallback?.name ?? "Payment app");
  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : (fallback?.enabled ?? false);
  const customUrl =
    typeof obj.customUrl === "string" && obj.customUrl.trim() ? obj.customUrl.trim() : undefined;
  return { id, name, enabled, preset, ...(customUrl ? { customUrl } : {}) };
}

function mergeWithDefaults(apps: PaymentApp[]): PaymentApp[] {
  const defaultsById = new Map(defaultPaymentAppsPreferences().map((a) => [a.id, a]));
  const byId = new Map(apps.map((a) => [a.id, a]));
  const merged: PaymentApp[] = PAYMENT_APP_PRESET_DEFINITIONS.map((def) => {
    const id = presetAppId(def.preset);
    const existing = byId.get(id);
    if (existing) return existing;
    const fallback = defaultsById.get(id);
    return (
      fallback ?? {
        id,
        name: def.name,
        enabled: false,
        preset: def.preset,
      }
    );
  });
  for (const app of apps) {
    if (app.preset === "custom" && !merged.some((m) => m.id === app.id)) {
      merged.push(app);
    }
  }
  return merged;
}

function normalizeList(raw: unknown): PaymentApp[] {
  if (!Array.isArray(raw)) return defaultPaymentAppsPreferences();
  const parsed: PaymentApp[] = [];
  for (const item of raw) {
    const app = normalizeApp(item);
    if (app) parsed.push(app);
  }
  if (parsed.length === 0) return defaultPaymentAppsPreferences();
  return mergeWithDefaults(parsed);
}

export function getEnabledPaymentApps(apps: PaymentApp[]): PaymentApp[] {
  return apps.filter((a) => a.enabled);
}

export function newCustomPaymentAppId(): string {
  return `custom-${Date.now().toString(36)}`;
}

export async function loadPaymentAppsPreferences(): Promise<PaymentApp[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeList(JSON.parse(raw));
  } catch {
    /* fall through */
  }

  const profile = await loadCompanyProfile();
  if (profile?.paymentApps) {
    return normalizeList(profile.paymentApps);
  }

  return defaultPaymentAppsPreferences();
}

export async function savePaymentAppsPreferences(apps: PaymentApp[]): Promise<void> {
  const normalized = mergeWithDefaults(apps);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

  const stored = await loadCompanyProfile();
  const merged = companyProfileFromPartial(stored);
  await saveCompanyProfile({
    ...merged,
    paymentApps: normalized,
  });
}

export function labelForPaymentApp(app: PaymentApp): string {
  if (app.preset !== "custom") {
    const def = PAYMENT_APP_PRESET_DEFINITIONS.find((d) => d.preset === app.preset);
    return def?.name ?? app.name;
  }
  return app.name;
}
