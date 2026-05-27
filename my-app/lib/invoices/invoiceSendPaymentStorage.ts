import AsyncStorage from "@react-native-async-storage/async-storage";

export const INVOICE_LAST_SEND_PAYMENT_STORAGE_KEY = "ideal_invoice_last_send_payment_v1";

export async function loadLastInvoiceSendPaymentId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(INVOICE_LAST_SEND_PAYMENT_STORAGE_KEY);
    const id = raw?.trim();
    return id ? id : null;
  } catch {
    return null;
  }
}

export async function saveLastInvoiceSendPaymentId(id: string): Promise<void> {
  const trimmed = id.trim();
  if (!trimmed) return;
  await AsyncStorage.setItem(INVOICE_LAST_SEND_PAYMENT_STORAGE_KEY, trimmed);
}
