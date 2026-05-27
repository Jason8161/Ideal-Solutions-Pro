import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  PAYMENT_APP_PRESET_DEFINITIONS,
  defaultPaymentAppsPreferences,
  labelForPaymentApp,
  loadPaymentAppsPreferences,
  type PaymentApp,
  type PaymentAppPresetId,
} from "@/lib/paymentAppsPreferences";

import type { InvoicePaymentProvider, InvoicePaymentSettings } from "./invoicePaymentSettingsStorage";

export const CUSTOMER_PAYMENT_METHODS_STORAGE_KEY = "ideal_customer_payment_methods_v1";

export type CustomerPaymentMethod = {
  id: string;
  name: string;
  enabled: boolean;
  preset: PaymentAppPresetId;
  /** Stripe link, PayPal.me, $Cashtag URL, Venmo handle link, etc. */
  payUrl?: string;
};

function presetAppId(preset: Exclude<PaymentAppPresetId, "custom">): string {
  return preset;
}

export function defaultCustomerPaymentMethods(): CustomerPaymentMethod[] {
  return defaultPaymentAppsPreferences().map((app) => ({
    id: app.id,
    name: labelForPaymentApp(app),
    enabled: app.enabled,
    preset: app.preset,
    ...(app.customUrl ? { payUrl: app.customUrl } : {}),
  }));
}

function normalizeMethod(raw: unknown, fallback?: CustomerPaymentMethod): CustomerPaymentMethod | null {
  if (typeof raw !== "object" || raw === null) return fallback ?? null;
  const obj = raw as Partial<CustomerPaymentMethod>;
  const preset =
    obj.preset === "custom" ||
    PAYMENT_APP_PRESET_DEFINITIONS.some((d) => d.preset === obj.preset)
      ? (obj.preset as PaymentAppPresetId)
      : (fallback?.preset ?? "custom");
  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : fallback?.id;
  if (!id) return null;
  const name =
    typeof obj.name === "string" && obj.name.trim()
      ? obj.name.trim()
      : (fallback?.name ?? "Payment method");
  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : (fallback?.enabled ?? false);
  const payUrl =
    typeof obj.payUrl === "string" && obj.payUrl.trim() ? obj.payUrl.trim() : undefined;
  return { id, name, enabled, preset, ...(payUrl ? { payUrl } : {}) };
}

function mergeWithDefaults(methods: CustomerPaymentMethod[]): CustomerPaymentMethod[] {
  const defaultsById = new Map(defaultCustomerPaymentMethods().map((m) => [m.id, m]));
  const byId = new Map(methods.map((m) => [m.id, m]));
  const merged: CustomerPaymentMethod[] = PAYMENT_APP_PRESET_DEFINITIONS.map((def) => {
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
  for (const method of methods) {
    if (method.preset === "custom" && !merged.some((m) => m.id === method.id)) {
      merged.push(method);
    }
  }
  return merged;
}

function normalizeList(raw: unknown): CustomerPaymentMethod[] {
  if (!Array.isArray(raw)) return defaultCustomerPaymentMethods();
  const parsed: CustomerPaymentMethod[] = [];
  for (const item of raw) {
    const method = normalizeMethod(item);
    if (method) parsed.push(method);
  }
  if (parsed.length === 0) return defaultCustomerPaymentMethods();
  return mergeWithDefaults(parsed);
}

export function getEnabledCustomerPaymentMethods(
  methods: CustomerPaymentMethod[],
): CustomerPaymentMethod[] {
  return methods.filter((m) => m.enabled);
}

export async function loadCustomerPaymentMethods(): Promise<CustomerPaymentMethod[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMER_PAYMENT_METHODS_STORAGE_KEY);
    if (raw) return normalizeList(JSON.parse(raw));
  } catch {
    /* fall through */
  }
  const apps = await loadPaymentAppsPreferences();
  return paymentAppsToCustomerMethods(apps);
}

export async function saveCustomerPaymentMethods(methods: CustomerPaymentMethod[]): Promise<void> {
  const normalized = mergeWithDefaults(methods);
  await AsyncStorage.setItem(CUSTOMER_PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(normalized));
}

export function paymentAppsToCustomerMethods(apps: PaymentApp[]): CustomerPaymentMethod[] {
  const defaults = defaultCustomerPaymentMethods();
  const byId = new Map(apps.map((a) => [a.id, a]));
  return mergeWithDefaults(
    defaults.map((method) => {
      const app = byId.get(method.id);
      if (!app) return method;
      return {
        ...method,
        name: labelForPaymentApp(app),
        enabled: app.enabled,
        ...(app.customUrl ? { payUrl: app.customUrl } : method.payUrl ? { payUrl: method.payUrl } : {}),
      };
    }),
  ).map((method) => {
    const app = byId.get(method.id);
    if (!app) return method;
    return {
      ...method,
      enabled: app.enabled,
      name: labelForPaymentApp(app),
      payUrl: method.payUrl ?? app.customUrl,
    };
  });
}

export function customerMethodsToPaymentApps(
  methods: CustomerPaymentMethod[],
  existingApps: PaymentApp[],
): PaymentApp[] {
  const byId = new Map(existingApps.map((a) => [a.id, a]));
  return mergeWithDefaults(methods).map((method) => {
    const existing = byId.get(method.id);
    if (existing) {
      return {
        ...existing,
        enabled: method.enabled,
        name: method.name,
        ...(method.payUrl ? { customUrl: method.payUrl } : {}),
      };
    }
    if (method.preset === "custom") {
      return {
        id: method.id,
        name: method.name,
        enabled: method.enabled,
        preset: "custom",
        customUrl: method.payUrl,
      };
    }
    return {
      id: method.id,
      name: method.name,
      enabled: method.enabled,
      preset: method.preset,
      ...(method.payUrl ? { customUrl: method.payUrl } : {}),
    };
  });
}

const INVOICE_PROVIDER_TO_PRESET: Partial<Record<InvoicePaymentProvider, PaymentAppPresetId>> = {
  stripe: "stripe",
  square: "square",
  paypal: "paypal",
  venmo: "venmo",
  cashapp: "cashapp",
};

/** Apply invoice payment settings URL to the matching customer payment method. */
export function applyInvoicePaymentSettingsToCustomerMethods(
  methods: CustomerPaymentMethod[],
  settings: InvoicePaymentSettings,
): CustomerPaymentMethod[] {
  if (!settings.enabled || !settings.paymentLinkBaseUrl.trim()) return methods;
  const preset = INVOICE_PROVIDER_TO_PRESET[settings.provider];
  if (!preset || preset === "custom") return methods;
  const id = presetAppId(preset);
  return mergeWithDefaults(
    methods.map((m) =>
      m.id === id || m.preset === preset
        ? { ...m, enabled: true, payUrl: settings.paymentLinkBaseUrl.trim() }
        : m,
    ),
  );
}

export async function syncCustomerMethodsFromPaymentApps(): Promise<CustomerPaymentMethod[]> {
  const apps = await loadPaymentAppsPreferences();
  const methods = paymentAppsToCustomerMethods(apps);
  await saveCustomerPaymentMethods(methods);
  return methods;
}
