import { Link, Redirect, type Href } from "expo-router";
import { Pressable } from "react-native";

import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { JobFolderCategoryCard } from "@/components/bossMan/JobFolderCategoryCard";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { JOB_FOLDER_CATEGORIES, jobFolderHubHref } from "@/lib/bossMan/jobFolderCategories";
import { isProTier } from "@/lib/subscriptionGating";

export default function BossManModeScreen() {
  const { activeTier } = useSubscription();
  const { styles } = useBossManChrome();

  if (!isProTier(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  return (
    <ScStickyScroll
      backHref="/"
      title="Job Folder"
      subtitle="Contractor command center — pick a section for jobs, materials, or crew tools."
    >
      {JOB_FOLDER_CATEGORIES.map((category) => (
        <Link key={category.id} href={jobFolderHubHref(category.id)} asChild>
          <Pressable
            style={({ pressed }) => [
              styles.navRow,
              styles.categoryCard,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={category.label}
            accessibilityHint={category.subtitle}
          >
            <JobFolderCategoryCard category={category} />
          </Pressable>
        </Link>
      ))}
    </ScStickyScroll>
  );
}
