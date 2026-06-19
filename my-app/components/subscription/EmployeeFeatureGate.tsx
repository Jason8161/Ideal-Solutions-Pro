import { usePathname } from "expo-router";
import { useEffect, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, View } from "react-native";

import { FeatureGate } from "@/components/subscription/FeatureGate";
import { isEmployeeAppVariant } from "@/lib/auth/appVariant";
import { resolveCurrentAppRole } from "@/lib/auth/sessionRole";
import { isEmployeeAppRole } from "@/lib/auth/roles";
import { isEmployeeSessionActive } from "@/lib/employeeSession";

function isEmployeeJoinPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return p === "/employee/join" || p.endsWith("/employee/join");
}

/**
 * Subscription gate for boss `/employee/*` routes.
 * Employee portal users and invite-code join always pass; other boss users need Super Boss Man+.
 */
export function EmployeeFeatureGate({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? "";
  const [portalReady, setPortalReady] = useState(false);
  const [employeePortal, setEmployeePortal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([isEmployeeSessionActive(), resolveCurrentAppRole()]).then(([active, role]) => {
      if (cancelled) return;
      setEmployeePortal(active || isEmployeeAppRole(role) || isEmployeeAppVariant());
      setPortalReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!portalReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (employeePortal || isEmployeeJoinPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <FeatureGate feature="employees" waitForSubscription>
      {children}
    </FeatureGate>
  );
}
