import { Link, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { navCardStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { isAppSubscriptionAdmin } from "@/lib/auth/subscriptionAdmin";
import type { ColorScheme } from "@/lib/colorSchemeStorage";

export function AdminFreeAccessLink() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session, profile } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isAppSubscriptionAdmin(session?.userId ?? "", profile?.email).then((ok) => {
      if (!cancelled) setVisible(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.userId, profile?.email]);

  if (!visible) return null;

  return (
    <Link href={"/settings/admin-free-access" as Href} asChild>
      <TouchableOpacity style={styles.card} activeOpacity={0.85}>
        <Text style={styles.title}>Admin: free access</Text>
        <Text style={styles.hint}>Grant complimentary subscription tiers by user ID or email.</Text>
      </TouchableOpacity>
    </Link>
  );
}

function makeStyles(colors: ColorScheme) {
  const nav = navCardStyle(colors);
  return StyleSheet.create({
    card: { ...nav, padding: 16, marginTop: 12 },
    title: { color: colors.accent, fontSize: 17, fontWeight: "800" },
    hint: { color: colors.text, opacity: 0.72, fontSize: 13, marginTop: 6, lineHeight: 18 },
  });
}
