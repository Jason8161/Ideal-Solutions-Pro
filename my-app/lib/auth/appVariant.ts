export type AppVariant = "pro" | "employee";

function readVariantEnv(): string {
  if (typeof process !== "undefined") {
    const v =
      process.env.APP_VARIANT?.trim() ||
      process.env.EXPO_PUBLIC_APP_VARIANT?.trim() ||
      "";
    if (v) return v.toLowerCase();
  }
  return "";
}

/** Store listing variant: Pro (boss) vs Employee app from the same repo. */
export function getAppVariant(): AppVariant {
  const raw = readVariantEnv();
  if (raw === "employee") return "employee";
  return "pro";
}

export function isEmployeeAppVariant(): boolean {
  return getAppVariant() === "employee";
}

export function isProAppVariant(): boolean {
  return getAppVariant() === "pro";
}
