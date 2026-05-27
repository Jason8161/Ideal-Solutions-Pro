import type { ExistingContact } from "expo-contacts";

import { mapExistingContactToFields } from "@/lib/mapPhoneContactToCustomer";
import type { EmployeeInput, EmployeeStatus } from "@/lib/employees/types";

function displayName(c: ExistingContact): string {
  const n = (c.name ?? "").trim();
  if (n) return n;
  const parts = [c.firstName, c.middleName, c.lastName]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.join(" ");
}

/** Split device contact into employee first / last name fields. */
export function splitContactName(
  contact: ExistingContact,
  fallbackDisplayName: string,
): Pick<EmployeeInput, "firstName" | "lastName"> {
  const fn = (contact.firstName ?? "").trim();
  const ln = (contact.lastName ?? "").trim();
  if (fn || ln) {
    return { firstName: fn, lastName: ln };
  }

  const display = fallbackDisplayName.trim();
  if (!display) {
    return { firstName: "", lastName: "" };
  }
  const space = display.indexOf(" ");
  if (space < 0) {
    return { firstName: display, lastName: "" };
  }
  return {
    firstName: display.slice(0, space).trim(),
    lastName: display.slice(space + 1).trim(),
  };
}

function formatAddress(fields: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const line1 = fields.street.trim();
  const cityState = [fields.city.trim(), fields.state.trim()].filter(Boolean).join(", ");
  const cityStateZip = [cityState, fields.zip.trim()].filter(Boolean).join(" ");
  return [line1, cityStateZip].filter(Boolean).join("\n");
}

/** Map a picked device contact into employee form fields (other fields left at defaults). */
export function mapContactToEmployeeInput(
  contact: ExistingContact,
  defaultStatus: EmployeeStatus,
): Partial<EmployeeInput> {
  const mapped = mapExistingContactToFields(contact);
  const { firstName, lastName } = splitContactName(contact, displayName(contact));
  const phone =
    mapped.phoneMobile.trim() || mapped.phoneHome.trim() || mapped.phoneWork.trim();
  const email = mapped.email.trim() || mapped.emailAlt.trim();

  return {
    firstName,
    lastName,
    phone,
    email,
    address: formatAddress(mapped),
    status: defaultStatus,
  };
}
