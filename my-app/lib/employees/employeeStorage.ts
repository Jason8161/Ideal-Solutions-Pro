import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Employee, EmployeeInput, EmployeeSortKey, EmployeeStatus } from "./types";

export const EMPLOYEES_STORAGE_KEY = "ideal_solutions_employees_v1";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function trimOptional(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

export function employeeDisplayName(employee: Pick<Employee, "firstName" | "lastName">): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function employeeFullName(employee: Employee): string {
  return employeeDisplayName(employee);
}

function parsePayRate(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function loadAll(): Promise<Employee[]> {
  try {
    const raw = await AsyncStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Employee[];
  } catch {
    return [];
  }
}

async function saveAll(employees: Employee[]): Promise<void> {
  await AsyncStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
}

export function sortEmployees(rows: Employee[], sortKey: EmployeeSortKey): Employee[] {
  const copy = [...rows];
  switch (sortKey) {
    case "pay_rate":
      return copy.sort((a, b) => parsePayRate(b.payRate) - parsePayRate(a.payRate));
    case "start_date":
      return copy.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
    case "name":
    default:
      return copy.sort((a, b) => employeeFullName(a).localeCompare(employeeFullName(b)));
  }
}

export function searchEmployees(rows: Employee[], query: string): Employee[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((e) => {
    const hay = [
      e.firstName,
      e.lastName,
      employeeFullName(e),
      e.jobTitle ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function employeeToInput(employee: Employee): EmployeeInput {
  const {
    id: _id,
    createdAt: _c,
    updatedAt: _u,
    ...input
  } = employee;
  return input;
}

export async function listEmployees(status?: EmployeeStatus): Promise<Employee[]> {
  const rows = await loadAll();
  const filtered = status ? rows.filter((e) => e.status === status) : rows;
  return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const rows = await loadAll();
  return rows.find((e) => e.id === id) ?? null;
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    throw new Error("First and last name are required");
  }

  const now = new Date().toISOString();
  const employee: Employee = {
    id: newId(),
    firstName,
    lastName,
    phone: trimOptional(input.phone),
    email: trimOptional(input.email),
    address: trimOptional(input.address),
    jobTitle: trimOptional(input.jobTitle),
    payRate: trimOptional(input.payRate),
    payType: input.payType,
    startDate: trimOptional(input.startDate),
    status: input.status,
    notes: trimOptional(input.notes),
    emergencyContactName: trimOptional(input.emergencyContactName),
    emergencyContactPhone: trimOptional(input.emergencyContactPhone),
    role: input.role ?? "technician",
    photoUri: trimOptional(input.photoUri),
    certifications: trimOptional(input.certifications),
    licenseNumber: trimOptional(input.licenseNumber),
    vehicleInfo: trimOptional(input.vehicleInfo),
    skillLevel: trimOptional(input.skillLevel),
    cloudEmployeeId: trimOptional(input.cloudEmployeeId),
    inviteStatus: input.inviteStatus ?? "none",
    lastLoginAt: trimOptional(input.lastLoginAt),
    createdAt: now,
    updatedAt: now,
  };

  const rows = await loadAll();
  rows.push(employee);
  await saveAll(rows);
  return employee;
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
  const rows = await loadAll();
  const idx = rows.findIndex((e) => e.id === id);
  if (idx < 0) {
    throw new Error("Employee not found");
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    throw new Error("First and last name are required");
  }

  const updated: Employee = {
    ...rows[idx],
    firstName,
    lastName,
    phone: trimOptional(input.phone),
    email: trimOptional(input.email),
    address: trimOptional(input.address),
    jobTitle: trimOptional(input.jobTitle),
    payRate: trimOptional(input.payRate),
    payType: input.payType,
    startDate: trimOptional(input.startDate),
    status: input.status,
    notes: trimOptional(input.notes),
    emergencyContactName: trimOptional(input.emergencyContactName),
    emergencyContactPhone: trimOptional(input.emergencyContactPhone),
    role: input.role ?? rows[idx].role ?? "technician",
    photoUri: trimOptional(input.photoUri),
    certifications: trimOptional(input.certifications),
    licenseNumber: trimOptional(input.licenseNumber),
    vehicleInfo: trimOptional(input.vehicleInfo),
    skillLevel: trimOptional(input.skillLevel),
    cloudEmployeeId: trimOptional(input.cloudEmployeeId) ?? rows[idx].cloudEmployeeId,
    inviteStatus: input.inviteStatus ?? rows[idx].inviteStatus ?? "none",
    lastLoginAt: trimOptional(input.lastLoginAt) ?? rows[idx].lastLoginAt,
    updatedAt: new Date().toISOString(),
  };

  rows[idx] = updated;
  await saveAll(rows);
  return updated;
}

export async function moveToPrevious(id: string): Promise<Employee> {
  const rows = await loadAll();
  const idx = rows.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Employee not found");
  rows[idx] = { ...rows[idx], status: "previous", updatedAt: new Date().toISOString() };
  await saveAll(rows);
  return rows[idx];
}

export async function restoreToCurrent(id: string): Promise<Employee> {
  const rows = await loadAll();
  const idx = rows.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Employee not found");
  rows[idx] = { ...rows[idx], status: "current", updatedAt: new Date().toISOString() };
  await saveAll(rows);
  return rows[idx];
}

export async function deleteEmployee(id: string): Promise<void> {
  const rows = await loadAll();
  await saveAll(rows.filter((e) => e.id !== id));
}

export function normalizeEmployeePhone(phone: string | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

function normalizeEmployeeEmail(email: string | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** Light duplicate check by phone (7+ digits) or email. */
export async function findEmployeeDuplicate(input: {
  phone?: string;
  email?: string;
  excludeId?: string;
}): Promise<Employee | null> {
  const phone = normalizeEmployeePhone(input.phone);
  const email = normalizeEmployeeEmail(input.email);
  if ((!phone || phone.length < 7) && !email) return null;

  const rows = await loadAll();
  return (
    rows.find((e) => {
      if (input.excludeId && e.id === input.excludeId) return false;
      if (phone.length >= 7 && normalizeEmployeePhone(e.phone) === phone) return true;
      if (email && normalizeEmployeeEmail(e.email) === email) return true;
      return false;
    }) ?? null
  );
}
