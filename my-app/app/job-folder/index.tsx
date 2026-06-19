import { Redirect } from "expo-router";

import { ScreenDebugBanner } from "@/components/debug/ScreenDebugBanner";
import { useSubscription } from "@/context/SubscriptionContext";
import { homeJobFolderHrefForTier } from "@/lib/subscriptionGating";

/** Job Folder entry — route matches active subscription tier (hub vs basic list). */
export default function JobFolderIndex() {
  const { activeTier } = useSubscription();
  return (
    <>
      <ScreenDebugBanner screenId="app/job-folder/index.tsx" />
      <Redirect href={homeJobFolderHrefForTier(activeTier)} />
    </>
  );
}
