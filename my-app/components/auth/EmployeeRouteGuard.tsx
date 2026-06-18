import { Redirect, usePathname, type Href } from "expo-router";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { isEmployeeAppVariant } from "@/lib/auth/appVariant";
import { isGuestTrialRoute } from "@/lib/auth/authPaths";
import {
  getHomeRouteForCompanyRole,
  getHomeRouteForSession,
  shouldBlockBossOnEmployeeRoute,
} from "@/lib/auth/routing";
import { resolveCurrentAppRole, resolveCurrentCompanyRole } from "@/lib/auth/sessionRole";
import { isBossAppRole, isEmployeeAppRole, type AppRole } from "@/lib/auth/roles";
import { loadEmployeeSession } from "@/lib/employeeSession";
import { isPathBlockedForRole } from "@/lib/permissions/roleAccess";
import type { CompanyRoleId } from "@/lib/permissions/companyRoles";

/**
 * Blocks employees from boss-only routes and redirects to the employee portal home.
 * Boss users are kept off /employee/* unless using the employee app variant.
 */
export function EmployeeRouteGuard({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? "";
  const onGuestTrialRoute = isGuestTrialRoute(pathname);
  const [role, setRole] = useState<AppRole | null>(null);
  const [companyRole, setCompanyRole] = useState<CompanyRoleId | null>(null);
  const [employeeSessionActive, setEmployeeSessionActive] = useState(false);
  const roleRef = useRef<AppRole | null>(null);
  const companyRoleRef = useRef<CompanyRoleId | null>(null);
  const employeeSessionActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      resolveCurrentAppRole(),
      resolveCurrentCompanyRole(),
      loadEmployeeSession(),
    ]).then(([next, coRole, employeeSession]) => {
      if (cancelled) return;
      roleRef.current = next;
      companyRoleRef.current = coRole;
      employeeSessionActiveRef.current = employeeSession.active;
      setRole(next);
      setCompanyRole(coRole);
      setEmployeeSessionActive(employeeSession.active);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const resolvedRole = role ?? roleRef.current;
  const resolvedCompanyRole = companyRole ?? companyRoleRef.current;
  const employeeActive = employeeSessionActive || employeeSessionActiveRef.current;
  const isEmployeePortal =
    isEmployeeAppRole(resolvedRole) ||
    isEmployeeAppVariant() ||
    resolvedCompanyRole === "employee" ||
    employeeActive;

  if (onGuestTrialRoute && !isEmployeePortal) {
    return children;
  }

  if (resolvedRole === null) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isPathBlockedForRole(pathname, resolvedRole, resolvedCompanyRole)) {
    return <Redirect href={getHomeRouteForSession(resolvedCompanyRole, resolvedRole)} />;
  }

  if (
    resolvedCompanyRole === "superintendent" &&
    !pathname.startsWith("/superintendent") &&
    pathname !== "/settings/user-info"
  ) {
    return <Redirect href={"/superintendent" as Href} />;
  }

  if (
    resolvedCompanyRole === "check_guy" &&
    !pathname.startsWith("/check-guy") &&
    pathname !== "/settings/user-info"
  ) {
    return <Redirect href={"/check-guy" as Href} />;
  }

  if (shouldBlockBossOnEmployeeRoute(resolvedRole, pathname) && isBossAppRole(resolvedRole) && !isEmployeeAppVariant()) {
    return <Redirect href={"/" as Href} />;
  }

  const p = pathname.toLowerCase();
  if ((p === "/" || p === "") && isEmployeePortal) {
    return <Redirect href={getHomeRouteForCompanyRole("employee")} />;
  }

  return children;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
