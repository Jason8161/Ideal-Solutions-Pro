/** Crew AI capability tier (included with company Pro+; legacy store entitlements may still apply). */
export type EmployeeAiTierId = "free" | "pro_employee" | "field_supervisor";

export const EMPLOYEE_AI_TIER_ORDER: EmployeeAiTierId[] = [
  "free",
  "pro_employee",
  "field_supervisor",
];

/** Who is consuming AI on this device session. */
export type AiUsageActor = "owner" | "employee";

/** Future-ready hooks for booking / auto-reply (not implemented in v1). */
export type EmployeeAiFutureFeature =
  | "online_booking"
  | "auto_reply"
  | "team_messaging"
  | "voice_to_ai";

export type AiUsageSnapshot = {
  actor: AiUsageActor;
  dayKey: string;
  monthKey: string;
  dailyQuestions: number;
  monthlyQuestions: number;
  lifetimeQuestions: number;
  /** Reserved for API billing later */
  tokensIn?: number;
  tokensOut?: number;
};

export type AiLimitCheckResult = {
  allowed: boolean;
  effectiveTier: EmployeeAiTierId;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  dailyUsed: number;
  monthlyUsed: number;
  /** 0–1, null when unlimited */
  dailyUtilization: number | null;
  nearingLimit: boolean;
  atLimit: boolean;
  blockReason: string | null;
};
