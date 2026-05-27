import { useRouter, type Href } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { useSubscription } from "@/context/SubscriptionContext";
import { UpgradePromptModal } from "@/components/subscription/UpgradePromptModal";
import {
  canAccessFeature,
  SUBSCRIPTION_SETTINGS_HREF,
  type FeatureKey,
} from "@/lib/subscription/featureAccess";

type FeatureGateProps = {
  feature: FeatureKey;
  children: ReactNode;
  /** When true, render nothing while subscription context loads */
  waitForSubscription?: boolean;
};

/**
 * Renders children when the active tier may use `feature`; otherwise shows {@link UpgradePromptModal}.
 */
export function FeatureGate({ feature, children, waitForSubscription = true }: FeatureGateProps) {
  const router = useRouter();
  const { loading, activeTier, featureAccessContext } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (waitForSubscription && loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const allowed = canAccessFeature(feature, activeTier, featureAccessContext);

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <>
      <UpgradePromptModal
        visible={!dismissed}
        feature={feature}
        tier={activeTier}
        accessContext={featureAccessContext}
        onClose={() => {
          setDismissed(true);
          router.replace(SUBSCRIPTION_SETTINGS_HREF as Href);
        }}
      />
    </>
  );
}
