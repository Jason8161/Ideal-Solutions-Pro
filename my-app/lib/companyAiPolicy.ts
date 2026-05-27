import AsyncStorage from "@react-native-async-storage/async-storage";

import type { EmployeeAiTierId } from "@/lib/employeeAi/types";

const STORAGE_KEY = "ideal_company_ai_policy_v1";

/** How the company handles employee AI billing. */
export type CompanyAiPolicyMode = "byo" | "company_sponsored";

export type CompanyAiPolicy = {
  mode: CompanyAiPolicyMode;
  /**
   * When mode is company_sponsored, tier applied to all employees on this device.
   * v1 default: pro_employee (Field Supervisor sponsorship can be added later).
   */
  sponsoredTier: EmployeeAiTierId;
  updatedAt: string;
};

const DEFAULT_POLICY: CompanyAiPolicy = {
  mode: "company_sponsored",
  sponsoredTier: "pro_employee",
  updatedAt: new Date(0).toISOString(),
};

export async function loadCompanyAiPolicy(): Promise<CompanyAiPolicy> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_POLICY, updatedAt: new Date().toISOString() };
    const parsed = JSON.parse(raw) as Partial<CompanyAiPolicy>;
    return {
      mode: parsed.mode === "company_sponsored" ? "company_sponsored" : "byo",
      sponsoredTier:
        parsed.sponsoredTier === "field_supervisor" ? "field_supervisor" : "pro_employee",
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_POLICY, updatedAt: new Date().toISOString() };
  }
}

export async function saveCompanyAiPolicy(policy: Omit<CompanyAiPolicy, "updatedAt">): Promise<void> {
  const next: CompanyAiPolicy = {
    ...policy,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function companyAiPolicyLabel(mode: CompanyAiPolicyMode): string {
  return mode === "company_sponsored"
    ? "Crew AI included with company plan (Pro+)"
    : "Legacy: individual employee billing";
}
