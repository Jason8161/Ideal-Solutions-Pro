import type { Customer } from "@/lib/customerStorage";
import {
  customerFromServiceCallFields,
  emptyEstimateCustomer,
  type EstimateCustomer,
} from "@/lib/estimateStorage";
import type { ServiceCallCustomerFields } from "@/lib/mapPhoneContactToCustomer";

export function estimateCustomerFromDirectory(customer: Customer): EstimateCustomer {
  const street = customer.address?.trim() ?? "";
  return {
    ...emptyEstimateCustomer(),
    customerName: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    street,
  };
}

export function estimateCustomerFromServiceCallFields(fields: ServiceCallCustomerFields): EstimateCustomer {
  return customerFromServiceCallFields(fields);
}

export function formatEstimateCustomerAddress(customer: EstimateCustomer): string {
  const street = customer.street.trim();
  const city = customer.city.trim();
  const state = customer.state.trim();
  const zip = customer.zip.trim();
  const cityState = [city, state].filter(Boolean).join(", ");
  const cityLine = cityState ? (zip ? `${cityState} ${zip}` : cityState) : zip;
  return [street, cityLine].filter(Boolean).join("\n");
}

export function estimateCustomerFromManualEntry(input: {
  name: string;
  phone: string;
  email: string;
  address: string;
}): EstimateCustomer {
  const displayName = input.name.trim() || input.phone.trim() || input.email.trim();
  return {
    ...emptyEstimateCustomer(),
    customerName: displayName,
    phone: input.phone.trim(),
    email: input.email.trim(),
    street: input.address.trim(),
  };
}
