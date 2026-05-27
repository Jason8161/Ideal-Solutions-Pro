import { Link, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { secondaryButtonStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { applyCustomerEstimateAcceptance } from "@/lib/estimateStorage";

type Status = "loading" | "ok" | "err";

export default function CustomerAcceptEstimateScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ id?: string; t?: string; estimateId?: string; token?: string }>();

  const estimateId = useMemo(() => {
    const a = typeof params.id === "string" ? params.id : "";
    const b = typeof params.estimateId === "string" ? params.estimateId : "";
    return a || b;
  }, [params.estimateId, params.id]);

  const token = useMemo(() => {
    const a = typeof params.t === "string" ? params.t : "";
    const b = typeof params.token === "string" ? params.token : "";
    return a || b;
  }, [params.t, params.token]);

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!estimateId.trim() || !token.trim()) {
      setStatus("err");
      setMessage("This link is missing required information. Ask your contractor to resend the estimate.");
      return;
    }
    let cancelled = false;
    void applyCustomerEstimateAcceptance({ estimateId: estimateId.trim(), token: token.trim() }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setStatus("ok");
        setMessage(
          "Thank you — your estimate is accepted and we will move forward with scheduling. You can close this page.",
        );
        return;
      }
      if (res.reason === "not_found") {
        setStatus("err");
        setMessage(
          "We could not find this estimate on this device. If you opened the link on your phone, ask your contractor to confirm the link or accept the estimate manually.",
        );
        return;
      }
      setStatus("err");
      setMessage("This link is invalid or no longer matches this estimate. Please contact your contractor.");
    });
    return () => {
      cancelled = true;
    };
  }, [estimateId, token]);

  return (
    <View style={styles.flex}>
      {status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} size="large" />
          <Text style={[styles.body, { marginTop: 16 }]}>Confirming your estimate…</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.title}>{status === "ok" ? "Estimate accepted" : "Could not accept"}</Text>
          <Text style={styles.body}>{message}</Text>
          <Link href={"/estimates" as Href} asChild>
            <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
              <Text style={styles.btnText}>Back to estimates</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ColorScheme) {
  const outlineBtn = secondaryButtonStyle(colors);

  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: "transparent" },
    center: { flex: 1, padding: 24, justifyContent: "center" },
    title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 12 },
    body: { fontSize: 16, lineHeight: 24, color: colors.text, marginBottom: 24 },
    btn: {
      ...outlineBtn,
      alignSelf: "flex-start",
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 12,
    },
    btnText: { color: colors.text, fontWeight: "800", fontSize: 16 },
    pressed: { opacity: 0.88 },
  });
}
