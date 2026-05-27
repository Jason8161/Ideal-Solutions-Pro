import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { navCardStyle } from "@/components/themed/screenChrome";
import { useAppTheme } from "@/context/ThemeContext";
import type { ColorScheme } from "@/lib/colorSchemeStorage";
import { hexToRgba } from "@/lib/colorSchemeStorage";
import {
  featureGateAlertTitle,
  featureGateMessage,
  getUpgradeTarget,
  SUBSCRIPTION_SETTINGS_HREF,
  type FeatureAccessContext,
  type FeatureKey,
} from "@/lib/subscription/featureAccess";
import { getSubscriptionPlan, type SubscriptionTierId } from "@/lib/subscription/tiers";
import { deferAfterModalClose } from "@/lib/deferNavigation";

export type UpgradePromptModalProps = {
  visible: boolean;
  feature: FeatureKey;
  tier: SubscriptionTierId;
  onClose: () => void;
  accessContext?: FeatureAccessContext;
};

export function UpgradePromptModal({
  visible,
  feature,
  tier,
  onClose,
  accessContext,
}: UpgradePromptModalProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const message =
    featureGateMessage(feature, tier, accessContext) ??
    "This tool needs a higher plan. Step up when you're ready.";
  const target = getUpgradeTarget(tier, feature);
  const targetPlan = getSubscriptionPlan(target);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss upgrade prompt">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconRow}>
            <Ionicons name="hammer" size={28} color={colors.accent} />
            <Text style={styles.title}>{featureGateAlertTitle(feature)}</Text>
          </View>
          <Text style={styles.body}>{message}</Text>
          <Text style={styles.hint}>
            {targetPlan.id === tier
              ? "Pick a plan on the next screen that matches how you run jobs."
              : `${targetPlan.name} (${targetPlan.priceLabel}) unlocks this on the jobsite.`}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => {
              deferAfterModalClose(onClose, () => {
                router.push(SUBSCRIPTION_SETTINGS_HREF as Href);
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="View subscription plans"
          >
            <Text style={styles.primaryText}>See plans &amp; upgrade</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Not right now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ColorScheme) {
  const card = navCardStyle(colors);
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: hexToRgba(colors.text, 0.45),
      justifyContent: "center",
      padding: 20,
    },
    sheet: {
      ...card,
      padding: 18,
      gap: 12,
      maxWidth: 420,
      alignSelf: "center",
      width: "100%",
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      opacity: 0.92,
    },
    hint: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
      opacity: 0.78,
      fontStyle: "italic",
    },
    primary: {
      marginTop: 4,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: hexToRgba(colors.accent, 0.22),
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent, 0.45),
      alignItems: "center",
    },
    secondary: {
      paddingVertical: 10,
      alignItems: "center",
    },
    primaryText: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
    },
    secondaryText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      opacity: 0.85,
    },
    pressed: { opacity: 0.88 },
  });
}
