import { Redirect } from "expo-router";

import { useSubscription } from "@/context/SubscriptionContext";
import { homeJobFolderHrefForTier } from "@/lib/subscriptionGating";

/** Job Folder entry — route matches active subscription tier (hub vs basic list). */
export default function JobFolderIndex() {
  const { activeTier } = useSubscription();
  return <Redirect href={homeJobFolderHrefForTier(activeTier)} />;
}
