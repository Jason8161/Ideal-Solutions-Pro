import { Redirect, usePathname, type Href } from "expo-router";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";

import { isEmployeeAppVariant } from "@/lib/auth/appVariant";
import { getHomeRouteForRole, shouldBlockBossOnEmployeeRoute } from "@/lib/auth/routing";
import { resolveCurrentAppRole } from "@/lib/auth/sessionRole";
import { isBossAppRole, isEmployeeAppRole, type AppRole } from "@/lib/auth/roles";
import { isPathBlockedForRole } from "@/lib/permissions/roleAccess";

/**
 * Redirects by workspace role: employees away from boss routes; bosses away from /employee (unless dev employee mode).
 */
export function RoleRouteGuard({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [role, setRole] = useState<AppRole | null>(null);
  const roleRef = useRef<AppRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveCurrentAppRole().then((next) => {
      if (cancelled) return;
      roleRef.current = next;
      setRole(next);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const resolvedRole = role ?? roleRef.current;
  if (resolvedRole === null) return null;

  if (isPathBlockedForRole(pathname, resolvedRole)) {
    return <Redirect href={getHomeRouteForRole(resolvedRole)} />;
  }

  if (shouldBlockBossOnEmployeeRoute(resolvedRole, pathname) && isBossAppRole(resolvedRole) && !isEmployeeAppVariant()) {
    return <Redirect href={"/" as Href} />;
  }

  const p = pathname.toLowerCase();
  if (
    (p === "/" || p === "") &&
    (isEmployeeAppRole(resolvedRole) || isEmployeeAppVariant())
  ) {
    return <Redirect href={"/employee" as Href} />;
  }

  return children;
}
