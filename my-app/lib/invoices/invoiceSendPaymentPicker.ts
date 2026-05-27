import { ActionSheetIOS, Alert, Platform } from "react-native";

import {
  getEnabledCustomerPaymentMethods,
  loadCustomerPaymentMethods,
  type CustomerPaymentMethod,
} from "./customerPaymentMethodsStorage";
import {
  INVOICE_PAYMENT_PROVIDER_LABELS,
  isInvoicePaymentLinkConfigured,
  isRemoteInvoicePaymentProvider,
  loadInvoicePaymentSettings,
  type InvoicePaymentProvider,
  type InvoicePaymentSettings,
} from "./invoicePaymentSettingsStorage";
import { buildInvoicePayLinkForMethod } from "./invoicePayLink";
import { buildInvoicePaymentLink } from "./invoicePaymentLink";
import { loadLastInvoiceSendPaymentId, saveLastInvoiceSendPaymentId } from "./invoiceSendPaymentStorage";
import type { BossInvoice } from "./types";

export type InvoiceSendPaymentOption = {
  id: string;
  label: string;
  kind: "method" | "legacy";
  method?: CustomerPaymentMethod;
  legacySettings?: InvoicePaymentSettings;
};

function labelForSendOption(method: CustomerPaymentMethod): string {
  const name = method.name.trim();
  if (name) return name;
  return method.preset === "custom" ? "Custom payment" : method.preset;
}

const LEGACY_PROVIDER_TO_PRESET: Partial<
  Record<InvoicePaymentProvider, CustomerPaymentMethod["preset"]>
> = {
  stripe: "stripe",
  square: "square",
  paypal: "paypal",
  venmo: "venmo",
  cashapp: "cashapp",
};

/** Enabled payment methods (and legacy invoice URL) available when texting or emailing invoices. */
export async function loadInvoiceSendPaymentOptions(): Promise<InvoiceSendPaymentOption[]> {
  const settings = await loadInvoicePaymentSettings();
  if (!settings.enabled) return [];

  const methods = await loadCustomerPaymentMethods();
  const enabled = getEnabledCustomerPaymentMethods(methods);
  const options: InvoiceSendPaymentOption[] = enabled.map((method) => ({
    id: method.id,
    label: labelForSendOption(method),
    kind: "method",
    method,
  }));

  if (
    isRemoteInvoicePaymentProvider(settings.provider) &&
    isInvoicePaymentLinkConfigured(settings)
  ) {
    const preset = LEGACY_PROVIDER_TO_PRESET[settings.provider];
    const coveredByMethod =
      preset &&
      options.some(
        (o) =>
          o.method?.preset === preset &&
          (o.method.payUrl?.trim() || settings.paymentLinkBaseUrl.trim()),
      );
    if (!coveredByMethod) {
      options.unshift({
        id: `legacy:${settings.provider}`,
        label: INVOICE_PAYMENT_PROVIDER_LABELS[settings.provider],
        kind: "legacy",
        legacySettings: settings,
      });
    }
  }

  return sortSendOptionsWithLastUsed(options, await loadLastInvoiceSendPaymentId());
}

export function sortSendOptionsWithLastUsed(
  options: InvoiceSendPaymentOption[],
  lastId: string | null,
): InvoiceSendPaymentOption[] {
  if (!lastId || options.length < 2) return options;
  const idx = options.findIndex((o) => o.id === lastId);
  if (idx <= 0) return options;
  const copy = [...options];
  const [picked] = copy.splice(idx, 1);
  return [picked!, ...copy];
}

export async function buildInvoicePayLinkForSendOption(
  invoice: BossInvoice,
  option: InvoiceSendPaymentOption,
): Promise<string | null> {
  if (option.kind === "legacy" && option.legacySettings) {
    return buildInvoicePaymentLink(invoice, option.legacySettings);
  }
  if (option.method) {
    return buildInvoicePayLinkForMethod(invoice, option.method);
  }
  return null;
}

function showAndroidWebPicker(
  options: InvoiceSendPaymentOption[],
  offset: number,
  resolve: (value: InvoiceSendPaymentOption | null) => void,
): void {
  const pageSize = Platform.OS === "android" ? 2 : 5;
  const slice = options.slice(offset, offset + pageSize);
  const remaining = options.length - (offset + slice.length);

  const buttons: { text: string; onPress?: () => void; style?: "cancel" }[] = slice.map(
    (option) => ({
      text: option.label,
      onPress: () => resolve(option),
    }),
  );

  if (remaining > 0) {
    buttons.push({
      text: `More (${remaining})…`,
      onPress: () => showAndroidWebPicker(options, offset + pageSize, resolve),
    });
  }

  buttons.push({ text: "Cancel", style: "cancel", onPress: () => resolve(null) });

  Alert.alert(
    offset === 0 ? "Payment link" : "More payment options",
    offset === 0
      ? "Which pay service link should the customer receive?"
      : "Choose a payment provider for this invoice.",
    buttons,
    { cancelable: true },
  );
}

/** Ask which enabled provider link to include before opening SMS or email. */
export function promptInvoiceSendPaymentOption(
  options: InvoiceSendPaymentOption[],
): Promise<InvoiceSendPaymentOption | null> {
  if (options.length === 0) return Promise.resolve(null);
  if (options.length === 1) return Promise.resolve(options[0]!);

  return new Promise((resolve) => {
    if (Platform.OS === "ios") {
      const labels = options.map((o) => o.label);
      const cancelButtonIndex = labels.length;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Payment link",
          message: "Which pay service link should the customer receive?",
          options: [...labels, "Cancel"],
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === undefined || buttonIndex === cancelButtonIndex) {
            resolve(null);
            return;
          }
          resolve(options[buttonIndex] ?? null);
        },
      );
      return;
    }

    showAndroidWebPicker(options, 0, resolve);
  });
}

export async function pickInvoiceSendPaymentOption(
  options: InvoiceSendPaymentOption[],
): Promise<InvoiceSendPaymentOption | null> {
  const picked = await promptInvoiceSendPaymentOption(options);
  if (picked) await saveLastInvoiceSendPaymentId(picked.id);
  return picked;
}
