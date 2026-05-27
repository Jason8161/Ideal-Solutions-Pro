import { isSubscriptionGatingDisabled } from "@/lib/subscriptionTesting";
import type { SubscriptionTierId } from "@/lib/subscriptionPlans";
import { loadCompanyAiPolicy, type CompanyAiPolicy } from "@/lib/companyAiPolicy";
import { loadEmployeeSession } from "@/lib/employeeSession";

import {
  ownerSubscriptionIncludesCrewAi,
  ownerSubscriptionIncludesOwnerAi,
} from "./companyAiIncluded";
import {
  COMPANY_SPONSORED_EMPLOYEE_TIER,
  limitsForEmployeeTier,
  limitsForOwnerTier,
  type AiUsageLimits,
} from "./limits";
import type { AiLimitCheckResult, AiUsageActor, AiUsageSnapshot, EmployeeAiTierId } from "./types";
import { getAddonCreditsRemaining } from "@/lib/subscription/aiQuota";

import { loadAiUsage } from "./usageStorage";
import { employeeAiTierMeetsMinimum } from "./tiers";

export type ResolvedAiAccess = {
  actor: AiUsageActor;
  isEmployee: boolean;
  employeeId?: string;
  /** Employee path only */
  employeeTier: EmployeeAiTierId;
  /** Owner path only */
  ownerSubscriptionTier: SubscriptionTierId;
  /** Pro+ company subscription includes crew AI (no employee self-serve billing). */
  crewAiIncluded: boolean;
  companyPolicy: CompanyAiPolicy;
  limits: AiUsageLimits;
  usage: AiUsageSnapshot;
  check: AiLimitCheckResult;
};

function utilization(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  return Math.min(1, used / limit);
}

type LimitMessageContext = {
  actor: AiUsageActor;
  ownerTier: SubscriptionTierId;
  crewAiIncluded: boolean;
};

function limitBlockReason(
  kind: "daily" | "monthly",
  dailyUsed: number,
  dailyLimit: number | null,
  monthlyUsed: number,
  monthlyLimit: number | null,
  ctx: LimitMessageContext,
): string {
  if (ctx.actor === "employee") {
    if (ctx.crewAiIncluded) {
      return kind === "daily"
        ? `You've reached today's fair-use crew AI limit included with your company plan (${dailyUsed}/${dailyLimit}).`
        : `You've reached this month's fair-use crew AI limit included with your company plan (${monthlyUsed}/${monthlyLimit}).`;
    }
    return kind === "daily"
      ? "You've used today's crew AI allowance. Ask your company to upgrade to Super Boss Man for crew AI included with the app subscription."
      : "Monthly crew AI allowance reached. Your company can unlock more by upgrading to Super Boss Man.";
  }

  if (!ownerSubscriptionIncludesOwnerAi(ctx.ownerTier)) {
    return kind === "daily"
      ? "You've hit your trial AI limit (5 total). Subscribe to continue using jobsite AI."
      : "Monthly AI limit reached. Upgrade your plan or add an AI pack under Settings.";
  }

  const cap =
    kind === "daily"
      ? `today's fair-use AI limit for your plan (${dailyUsed}/${dailyLimit})`
      : `this month's fair-use AI limit for your plan (${monthlyUsed}/${monthlyLimit})`;
  return `You've reached ${cap}. AI is included with your subscription — limits reset over time, or upgrade your app plan for higher capacity.`;
}

function buildCheck(
  effectiveTier: EmployeeAiTierId,
  limits: AiUsageLimits,
  usage: AiUsageSnapshot,
  messageCtx: LimitMessageContext,
  addonCreditsRemaining = 0,
): AiLimitCheckResult {
  const dailyLimit = limits.dailyQuestions;
  const monthlyLimit = limits.monthlyQuestions;
  const dailyUsed = usage.dailyQuestions;
  const monthlyUsed = usage.monthlyQuestions;
  const dailyUtil = utilization(dailyUsed, dailyLimit);
  const monthlyUtil = utilization(monthlyUsed, monthlyLimit);

  const atDaily = dailyLimit !== null && dailyUsed >= dailyLimit;
  const atMonthly = monthlyLimit !== null && monthlyUsed >= monthlyLimit;
  const nearingDaily =
    dailyUtil !== null && dailyUtil >= limits.warnAtDailyUtilization && !atDaily;
  const nearingMonthly =
    monthlyUtil !== null && monthlyUtil >= limits.warnAtDailyUtilization && !atMonthly;

  const atLimit = atDaily || atMonthly;
  const addonCoversLimit = atLimit && addonCreditsRemaining > 0;
  const nearingLimit = (nearingDaily || nearingMonthly) && !atLimit && !addonCoversLimit;

  let blockReason: string | null = null;
  if (atDaily && !addonCoversLimit) {
    blockReason = limitBlockReason("daily", dailyUsed, dailyLimit, monthlyUsed, monthlyLimit, messageCtx);
  } else if (atMonthly && !addonCoversLimit) {
    blockReason = limitBlockReason("monthly", dailyUsed, dailyLimit, monthlyUsed, monthlyLimit, messageCtx);
  }

  return {
    allowed: !atLimit || addonCoversLimit,
    effectiveTier,
    dailyLimit,
    monthlyLimit,
    dailyUsed,
    monthlyUsed,
    dailyUtilization: dailyUtil,
    nearingLimit,
    atLimit,
    blockReason,
  };
}

export type ResolveAiAccessInput = {
  ownerSubscriptionTier: SubscriptionTierId;
  /** From RevenueCat employee entitlements or dev override */
  purchasedEmployeeTier: EmployeeAiTierId | null;
  /** __DEV__ simulation */
  devEmployeeTierOverride?: EmployeeAiTierId | null;
};

function resolveEmployeeTier(
  policy: CompanyAiPolicy,
  purchased: EmployeeAiTierId | null,
  ownerTier: SubscriptionTierId,
  devOverride?: EmployeeAiTierId | null,
): EmployeeAiTierId {
  if (isSubscriptionGatingDisabled()) return "field_supervisor";
  if (devOverride) return devOverride;
  if (ownerSubscriptionIncludesCrewAi(ownerTier)) {
    return COMPANY_SPONSORED_EMPLOYEE_TIER;
  }
  if (policy.mode === "company_sponsored") {
    return policy.sponsoredTier ?? COMPANY_SPONSORED_EMPLOYEE_TIER;
  }
  if (purchased && employeeAiTierMeetsMinimum(purchased, "free")) {
    return purchased;
  }
  return "free";
}

export async function resolveAiAccess(input: ResolveAiAccessInput): Promise<ResolvedAiAccess> {
  const [session, policy] = await Promise.all([loadEmployeeSession(), loadCompanyAiPolicy()]);
  const isEmployee = session.active;
  const actor: AiUsageActor = isEmployee ? "employee" : "owner";
  const employeeId = session.employeeId;

  const crewAiIncluded = ownerSubscriptionIncludesCrewAi(input.ownerSubscriptionTier);
  const messageCtx: LimitMessageContext = {
    actor,
    ownerTier: input.ownerSubscriptionTier,
    crewAiIncluded,
  };

  if (isEmployee) {
    const employeeTier = resolveEmployeeTier(
      policy,
      input.purchasedEmployeeTier,
      input.ownerSubscriptionTier,
      input.devEmployeeTierOverride,
    );
    const limits = limitsForEmployeeTier(employeeTier);
    const usage = await loadAiUsage("employee", employeeId);
    const check = buildCheck(employeeTier, limits, usage, messageCtx);
    return {
      actor,
      isEmployee: true,
      employeeId,
      employeeTier,
      ownerSubscriptionTier: input.ownerSubscriptionTier,
      crewAiIncluded,
      companyPolicy: policy,
      limits,
      usage,
      check,
    };
  }

  const ownerLimits = { ...limitsForOwnerTier(input.ownerSubscriptionTier) };
  if (isSubscriptionGatingDisabled()) {
    ownerLimits.dailyQuestions = null;
    ownerLimits.monthlyQuestions = null;
  }
  const [usage, addonCreditsRemaining] = await Promise.all([
    loadAiUsage("owner"),
    getAddonCreditsRemaining(),
  ]);
  let check = buildCheck("free", ownerLimits, usage, messageCtx, addonCreditsRemaining);
  if (isSubscriptionGatingDisabled()) {
    check = {
      ...check,
      allowed: true,
      atLimit: false,
      nearingLimit: false,
      blockReason: null,
    };
  }
  return {
    actor: "owner",
    isEmployee: false,
    employeeTier: "free",
    ownerSubscriptionTier: input.ownerSubscriptionTier,
    crewAiIncluded,
    companyPolicy: policy,
    limits: ownerLimits,
    usage,
    check,
  };
}
