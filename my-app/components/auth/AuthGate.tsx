import { Redirect, usePathname, type Href } from "expo-router";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/lib/auth/AuthContext";
import { AUTH_LOGIN_HREF, isAuthRoute, isPublicAppRoute } from "@/lib/auth/authPaths";
import { loadEmployeeSession } from "@/lib/employeeSession";

/**
 * Redirects unauthenticated users to login; authenticated users away from auth screens.
 * Employee and invoice-pay routes stay public.
 */
export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();
  const [employeeActive, setEmployeeActive] = useState(false);
  const [employeeChecked, setEmployeeChecked] = useState(false);
  const initialGatePassedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadEmployeeSession().then((session) => {
      if (cancelled) return;
      setEmployeeActive(session.active);
      setEmployeeChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && employeeChecked) {
    initialGatePassedRef.current = true;
  }

  const onAuthScreen = isAuthRoute(pathname);
  const isPublic = isPublicAppRoute(pathname);
  const skipAuth = isPublic || employeeActive;

  if ((isLoading || !employeeChecked) && !initialGatePassedRef.current) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated && !skipAuth && !onAuthScreen) {
    return <Redirect href={AUTH_LOGIN_HREF as Href} />;
  }

  if (isAuthenticated && onAuthScreen) {
    return <Redirect href={"/" as Href} />;
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
