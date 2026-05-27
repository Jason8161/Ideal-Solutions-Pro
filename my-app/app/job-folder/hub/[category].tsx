import { Link, Redirect, useLocalSearchParams, type Href } from "expo-router";
import { Pressable, Text } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { JobFolderSubHubScreen } from "@/components/bossMan/JobFolderSubHubScreen";
import { useSubscription } from "@/context/SubscriptionContext";
import {
  isJobFolderCategoryId,
  type JobFolderCategoryId,
} from "@/lib/bossMan/jobFolderCategories";
import { isProTier } from "@/lib/subscriptionGating";

function JobsEstimatesFooter() {
  const { scStyles, styles } = useBossManChrome();

  return (
    <>
      <Text style={[scStyles.subtitle, { marginTop: 8, marginBottom: 12, fontWeight: "800" }]}>
        Quick actions
      </Text>

      <Link href={"/job-folder/new" as Href} asChild>
        <Pressable
          style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel="Create new job"
        >
          <Text style={scStyles.menuButtonText}>Create new job</Text>
        </Pressable>
      </Link>

      <Link href={"/estimates" as Href} asChild>
        <Pressable
          style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel="Full estimates workspace"
        >
          <Text style={scStyles.menuButtonText}>Full Estimates workspace →</Text>
        </Pressable>
      </Link>
    </>
  );
}

export default function JobFolderCategoryHubScreen() {
  const { activeTier } = useSubscription();
  const { category } = useLocalSearchParams<{ category: string }>();

  if (!isProTier(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  if (!category || !isJobFolderCategoryId(category)) {
    return <Redirect href={"/job-folder/boss-man" as Href} />;
  }

  const categoryId = category as JobFolderCategoryId;

  return (
    <JobFolderSubHubScreen
      categoryId={categoryId}
      footer={categoryId === "jobs-estimates" ? <JobsEstimatesFooter /> : undefined}
    />
  );
}
