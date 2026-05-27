import AsyncStorage from "@react-native-async-storage/async-storage";

const CUSTOMERS_STORAGE_KEY = "ideal_solutions_customers_v1";

export type CustomerSource = "manual" | "contacts";

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  source: CustomerSource;
  createdAt: string;
};

export type AddCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  source: CustomerSource;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function trimOptional(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

async function loadAll(): Promise<Customer[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Customer[];
  } catch {
    return [];
  }
}

async function saveAll(customers: Customer[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
}

export async function listCustomers(): Promise<Customer[]> {
  const rows = await loadAll();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const rows = await loadAll();
  return rows.find((c) => c.id === id) ?? null;
}

export async function addCustomer(input: AddCustomerInput): Promise<Customer> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Customer name is required");
  }

  const customer: Customer = {
    id: newId(),
    name,
    phone: trimOptional(input.phone),
    email: trimOptional(input.email),
    address: trimOptional(input.address),
    source: input.source,
    createdAt: new Date().toISOString(),
  };

  const rows = await loadAll();
  rows.push(customer);
  await saveAll(rows);
  return customer;
}
