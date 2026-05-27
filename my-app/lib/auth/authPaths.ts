const AUTH_SEGMENTS = new Set(["login", "signup", "forgot-password"]);

/** Routes that do not require an Ideal Solutions account session. */
const PUBLIC_PREFIXES = ["/employee", "/invoice-pay"];

export function isAuthRoute(pathname: string): boolean {
  const segment = pathname.replace(/^\//, "").split("/")[0] ?? "";
  return AUTH_SEGMENTS.has(segment);
}

export function isPublicAppRoute(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (isAuthRoute(p)) return true;
  return PUBLIC_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

export const AUTH_LOGIN_HREF = "/login" as const;
export const AUTH_SIGNUP_HREF = "/signup" as const;
export const AUTH_FORGOT_HREF = "/forgot-password" as const;
