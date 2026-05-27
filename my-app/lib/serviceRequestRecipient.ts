import type { SimpleCustomerContact } from "@/lib/customerContactPick";

export type ServiceRequestRecipientParams = {
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
};

export function recipientToRouteParams(
  recipient: SimpleCustomerContact,
): ServiceRequestRecipientParams {
  return {
    recipientName: recipient.name.trim() || undefined,
    recipientPhone: recipient.phone.trim() || undefined,
    recipientEmail: recipient.email.trim() || undefined,
  };
}

export function parseServiceRequestRecipient(
  params: Record<string, string | string[] | undefined>,
): SimpleCustomerContact {
  const one = (key: string) => {
    const v = params[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (v ?? "").trim();
  };
  return {
    name: one("recipientName"),
    phone: one("recipientPhone"),
    email: one("recipientEmail"),
  };
}

export function hasServiceRequestRecipient(recipient: SimpleCustomerContact): boolean {
  return Boolean(recipient.name.trim() || recipient.phone.trim() || recipient.email.trim());
}
