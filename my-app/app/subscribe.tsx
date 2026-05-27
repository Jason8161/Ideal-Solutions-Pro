import { Redirect } from "expo-router";

/** Legacy route — subscription tiers live under Settings → Subscription. */
export default function SubscribeRedirect() {
  return <Redirect href="/settings/subscribe" />;
}
