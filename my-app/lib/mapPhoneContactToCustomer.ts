import type { Contact, ExistingContact } from "expo-contacts";
import * as Contacts from "expo-contacts";

/** Customer + job-site fields for the Service Calls screen. */
export type ServiceCallCustomerFields = {
  customerName: string;
  companyName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  emailAlt: string;
  phoneMobile: string;
  phoneHome: string;
  phoneWork: string;
  workOrderNotes: string;
};

export function emptyServiceCallCustomerFields(): ServiceCallCustomerFields {
  return {
    customerName: "",
    companyName: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    emailAlt: "",
    phoneMobile: "",
    phoneHome: "",
    phoneWork: "",
    workOrderNotes: "",
  };
}

function displayName(c: ExistingContact): string {
  const n = (c.name ?? "").trim();
  if (n) return n;
  const parts = [c.firstName, c.middleName, c.lastName].map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  return parts.join(" ");
}

function slotForPhoneLabel(label: string): 0 | 1 | 2 {
  const l = label.toLowerCase();
  if (/(mobile|cell|iphone|pager)/i.test(l)) return 0;
  if (/(work|business|company|main)/i.test(l)) return 2;
  if (/(home|residence|personal|fax)/i.test(l)) return 1;
  return 0;
}

/** Map first address + first emails + up to three phones into the form. */
export function mapExistingContactToFields(c: ExistingContact): ServiceCallCustomerFields {
  const addr = c.addresses?.find((a) => a.street || a.city || a.region || a.postalCode) ?? c.addresses?.[0];
  const emails = (c.emails ?? []).map((e) => e.email?.trim() ?? "").filter(Boolean);

  const phoneEntries = (c.phoneNumbers ?? [])
    .map((p) => ({ n: p.number?.trim() ?? "", label: p.label ?? "", primary: !!p.isPrimary }))
    .filter((x) => x.n);
  phoneEntries.sort((a, b) => Number(b.primary) - Number(a.primary));

  const slots: [string, string, string] = ["", "", ""];
  const used = new Set<string>();

  for (const { n, label } of phoneEntries) {
    const slot = slotForPhoneLabel(label);
    if (!slots[slot]) {
      slots[slot] = n;
      used.add(n);
    }
  }
  for (const { n } of phoneEntries) {
    if (used.has(n)) continue;
    const empty = slots.findIndex((s) => !s);
    if (empty >= 0) slots[empty as 0 | 1 | 2] = n;
    used.add(n);
  }

  return {
    customerName: displayName(c),
    companyName: (c.company ?? "").trim(),
    street: (addr?.street ?? "").trim(),
    city: (addr?.city ?? "").trim(),
    state: (addr?.region ?? "").trim(),
    zip: (addr?.postalCode ?? "").trim(),
    email: emails[0] ?? "",
    emailAlt: emails[1] ?? "",
    phoneMobile: slots[0],
    phoneHome: slots[1],
    phoneWork: slots[2],
    workOrderNotes: "",
  };
}

/** Build a device contact from the form (save to address book). */
export function buildContactForDeviceSave(f: ServiceCallCustomerFields): Contact {
  const name = f.customerName.trim() || "Customer";
  const phoneNumbers = [
    f.phoneMobile.trim() && { number: f.phoneMobile.trim(), label: "mobile" },
    f.phoneHome.trim() && { number: f.phoneHome.trim(), label: "home" },
    f.phoneWork.trim() && { number: f.phoneWork.trim(), label: "work" },
  ].filter(Boolean) as Contact["phoneNumbers"];

  const emails = [
    f.email.trim() && { email: f.email.trim(), label: "work" },
    f.emailAlt.trim() && { email: f.emailAlt.trim(), label: "home" },
  ].filter(Boolean) as Contact["emails"];

  const hasAddr = !!(f.street.trim() || f.city.trim() || f.state.trim() || f.zip.trim());
  const addresses = hasAddr
    ? [
        {
          label: "home",
          street: f.street.trim(),
          city: f.city.trim(),
          region: f.state.trim(),
          postalCode: f.zip.trim(),
          country: "",
        },
      ]
    : undefined;

  return {
    contactType: Contacts.ContactTypes.Person,
    name,
    firstName: undefined,
    lastName: undefined,
    company: f.companyName.trim() || undefined,
    phoneNumbers: phoneNumbers?.length ? phoneNumbers : undefined,
    emails: emails?.length ? emails : undefined,
    addresses,
  };
}
