import type { Employee, PayType, CrewDispatchStatus } from "./types";
import { PAY_TYPE_LABELS, EMPLOYEE_ROLE_LABELS, CREW_DISPATCH_STATUS_LABELS } from "./types";

export function employeeDisplayName(employee: Pick<Employee, "firstName" | "lastName">): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export function formatPayRate(payRate: string | undefined, payType: PayType): string {
  if (!payRate?.trim()) return "—";
  const raw = payRate.trim();
  const suffix =
    payType === "hourly"
      ? "/hr"
      : payType === "day_rate"
        ? "/day"
        : payType === "salary"
          ? " salary"
          : "";
  return raw.startsWith("$") ? `${raw}${suffix}` : `$${raw}${suffix}`;
}

export function payTypeLabel(payType: PayType): string {
  return PAY_TYPE_LABELS[payType];
}

export function statusLabel(status: Employee["status"]): string {
  return status === "current" ? "Current" : "Previous";
}

export function roleLabel(role: Employee["role"]): string {
  const key = role ?? "technician";
  return EMPLOYEE_ROLE_LABELS[key];
}

export function dispatchStatusLabel(status: CrewDispatchStatus): string {
  return CREW_DISPATCH_STATUS_LABELS[status];
}
