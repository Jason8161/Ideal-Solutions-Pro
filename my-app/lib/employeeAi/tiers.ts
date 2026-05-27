import { EMPLOYEE_AI_TIER_ORDER, type EmployeeAiTierId } from "./types";

export type EmployeeAiPlan = {
  id: EmployeeAiTierId;
  name: string;
  priceLabel: string;
  monthlyPrice: number;
  tagline: string;
  features: string[];
  isPaid: boolean;
  revenueCatProductId?: string;
  revenueCatPackageId?: string;
  revenueCatEntitlementId?: string;
};

export const EMPLOYEE_AI_PLANS: EmployeeAiPlan[] = [
  {
    id: "free",
    name: "Crew (starter)",
    priceLabel: "Included",
    monthlyPrice: 0,
    tagline: "Basic crew AI until your company upgrades the app",
    features: [
      "Team messaging & job comm (coming soon)",
      "Schedules, assigned jobs, photos/updates",
      "5 AI questions per day (starter allowance)",
    ],
    isPaid: false,
  },
  {
    id: "pro_employee",
    name: "Crew AI (company Pro)",
    priceLabel: "Included with Pro",
    monthlyPrice: 0,
    tagline: "Included when your company has Pro Contractor or higher",
    features: [
      "Fair-use crew AI on the company subscription",
      "Advanced code & estimate assist",
      "Material list generation",
      "Voice-to-AI (coming soon)",
    ],
    isPaid: false,
    revenueCatProductId: "ideal_employee_pro_monthly",
    revenueCatPackageId: "ideal_employee_pro_monthly",
    revenueCatEntitlementId: "ideal_employee_pro",
  },
  {
    id: "field_supervisor",
    name: "Field Supervisor (legacy)",
    priceLabel: "Legacy store SKU",
    monthlyPrice: 0,
    tagline: "Grandfathered store entitlements only — not sold in-app",
    features: [
      "High fair-use AI (legacy entitlement)",
      "Crew tools & advanced estimating",
      "Jobsite docs & AI reports",
    ],
    isPaid: false,
    revenueCatProductId: "ideal_employee_supervisor_monthly",
    revenueCatPackageId: "ideal_employee_supervisor_monthly",
    revenueCatEntitlementId: "ideal_employee_supervisor",
  },
];

export function getEmployeeAiPlan(id: EmployeeAiTierId): EmployeeAiPlan {
  return EMPLOYEE_AI_PLANS.find((p) => p.id === id) ?? EMPLOYEE_AI_PLANS[0];
}

export function employeeAiTierRank(id: EmployeeAiTierId): number {
  const idx = EMPLOYEE_AI_TIER_ORDER.indexOf(id);
  return idx >= 0 ? idx : 0;
}

export function employeeAiTierMeetsMinimum(
  current: EmployeeAiTierId,
  required: EmployeeAiTierId,
): boolean {
  return employeeAiTierRank(current) >= employeeAiTierRank(required);
}
