import { monthlyAiLimitForTier, type SubscriptionTierId } from "@/lib/subscriptionPlans";

import type { EmployeeAiTierId } from "./types";

export type AiUsageLimits = {
  dailyQuestions: number | null;
  monthlyQuestions: number | null;
  warnAtDailyUtilization: number;
};

/** Owner AI limits keyed by company subscription tier (monthly caps). */
export const OWNER_AI_LIMITS: Record<SubscriptionTierId, AiUsageLimits> = {
  locked: { dailyQuestions: 0, monthlyQuestions: 0, warnAtDailyUtilization: 0.75 },
  side_hustle: { dailyQuestions: null, monthlyQuestions: 50, warnAtDailyUtilization: 0.75 },
  boss_man: { dailyQuestions: null, monthlyQuestions: 100, warnAtDailyUtilization: 0.75 },
  super_boss_man: { dailyQuestions: null, monthlyQuestions: 150, warnAtDailyUtilization: 0.75 },
  enterprise_boss_man: { dailyQuestions: null, monthlyQuestions: 200, warnAtDailyUtilization: 0.75 },
};

export const EMPLOYEE_AI_LIMITS: Record<EmployeeAiTierId, AiUsageLimits> = {
  free: { dailyQuestions: 5, monthlyQuestions: 50, warnAtDailyUtilization: 0.8 },
  pro_employee: { dailyQuestions: 50, monthlyQuestions: 600, warnAtDailyUtilization: 0.85 },
  field_supervisor: { dailyQuestions: null, monthlyQuestions: null, warnAtDailyUtilization: 0.9 },
};

export const COMPANY_SPONSORED_EMPLOYEE_TIER: EmployeeAiTierId = "pro_employee";

export function limitsForOwnerTier(tier: SubscriptionTierId): AiUsageLimits {
  const monthly = monthlyAiLimitForTier(tier);
  return (
    OWNER_AI_LIMITS[tier] ?? {
      dailyQuestions: null,
      monthlyQuestions: monthly,
      warnAtDailyUtilization: 0.75,
    }
  );
}

export function limitsForEmployeeTier(tier: EmployeeAiTierId): AiUsageLimits {
  return EMPLOYEE_AI_LIMITS[tier] ?? EMPLOYEE_AI_LIMITS.free;
}
